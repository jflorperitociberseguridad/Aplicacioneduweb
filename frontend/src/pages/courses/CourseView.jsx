import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { coursesApi, sectionsApi, itemsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import StatusBadge from '@/components/common/StatusBadge';
import VisibilityToggle from '@/components/common/VisibilityToggle';
import ContextMenu from '@/components/common/ContextMenu';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Settings,
  Users,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  GripVertical,
  FileText,
  File,
  Video,
  Link as LinkIcon,
  MessageSquare,
  ClipboardCheck,
  HelpCircle,
  ClipboardList,
  AlertTriangle
} from 'lucide-react';

const ITEM_ICONS = {
  page: FileText,
  file: File,
  video: Video,
  url: LinkIcon,
  forum: MessageSquare,
  assignment: ClipboardCheck,
  quiz: HelpCircle,
  feedback: ClipboardList,
  label: FileText
};

const CourseView = () => {
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isTeacher, isEditor } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [sectionItems, setSectionItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [stats, setStats] = useState(null);
  
  const isPreview = searchParams.get('preview') === 'true';
  const canEdit = (isTeacher() || isEditor()) && !isPreview && course?.status !== 'archived';

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  useEffect(() => {
    if (course && sections.length > 0) {
      setActiveSection(sections[0]?.id);
      // Expand all sections by default
      const expanded = {};
      sections.forEach(s => expanded[s.id] = true);
      setExpandedSections(expanded);
    }
  }, [course, sections]);

  const loadCourse = async () => {
    setLoading(true);
    try {
      const [courseData, sectionsData] = await Promise.all([
        coursesApi.get(courseId),
        sectionsApi.list(courseId)
      ]);
      
      setCourse(courseData);
      setSections(sectionsData);
      
      // Load items for each section
      const itemsPromises = sectionsData.map(section => 
        itemsApi.listBySection(section.id).then(items => ({ sectionId: section.id, items }))
      );
      const itemsResults = await Promise.all(itemsPromises);
      const itemsMap = {};
      itemsResults.forEach(({ sectionId, items }) => {
        itemsMap[sectionId] = items;
      });
      setSectionItems(itemsMap);
      
      // Load stats for teachers
      if (isTeacher()) {
        const statsData = await coursesApi.stats(courseId);
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading course:', error);
      toast.error('Error al cargar el curso');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSectionVisibility = async (section) => {
    try {
      await sectionsApi.update(courseId, section.id, { visible: !section.visible });
      loadCourse();
      toast.success(section.visible ? 'Sección ocultada' : 'Sección visible');
    } catch (error) {
      toast.error('Error al cambiar visibilidad');
    }
  };

  const handleToggleItemVisibility = async (item) => {
    try {
      await itemsApi.toggleVisibility(item.id, !item.visible);
      loadCourse();
    } catch (error) {
      toast.error('Error al cambiar visibilidad');
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.title}"?`)) return;
    try {
      await itemsApi.delete(item.id);
      loadCourse();
      toast.success('Elemento eliminado');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleDuplicateItem = async (item) => {
    try {
      await itemsApi.duplicate(item.id);
      loadCourse();
      toast.success('Elemento duplicado');
    } catch (error) {
      toast.error('Error al duplicar');
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const getItemIcon = (itemType) => {
    const Icon = ITEM_ICONS[itemType] || FileText;
    return Icon;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-12 gap-6">
          <Skeleton className="col-span-3 h-[600px]" />
          <Skeleton className="col-span-9 h-[600px]" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Curso no encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs items={[
          { label: 'Cursos', href: '/courses' },
          { label: course.shortname }
        ]} />
        
        {/* Course status warnings */}
        {course.status !== 'published' && (
          <div className={cn(
            "mt-4 p-3 rounded-lg flex items-center gap-2",
            course.status === 'draft' && "bg-gray-100 text-gray-700",
            course.status === 'suspended' && "bg-orange-100 text-orange-700",
            course.status === 'archived' && "bg-slate-100 text-slate-700"
          )}>
            <AlertTriangle size={18} />
            <span className="text-sm font-medium">
              {course.status === 'draft' && 'Este curso está en modo borrador'}
              {course.status === 'suspended' && 'Este curso está suspendido - los estudiantes no pueden acceder'}
              {course.status === 'archived' && 'Este curso está archivado - solo lectura'}
            </span>
          </div>
        )}

        <div className="flex items-start justify-between mt-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{course.fullname}</h1>
              <StatusBadge status={course.status} />
              {!course.visible && <StatusBadge status="hidden" />}
            </div>
            <p className="text-gray-500 mt-1">{course.shortname}</p>
            
            {/* Summary expandable */}
            {course.summary && (
              <div 
                className="mt-3 text-sm text-gray-600 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: course.summary.slice(0, 200) + (course.summary.length > 200 ? '...' : '') }}
              />
            )}
          </div>

          {/* Quick stats for teachers */}
          {canEdit && stats && (
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{stats.section_count} secciones</span>
              <span>{stats.item_count} recursos</span>
              <span>{stats.student_count} estudiantes</span>
            </div>
          )}
        </div>

        {/* Action bar */}
        {canEdit && (
          <div className="flex items-center justify-between mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg transition-all",
                editMode ? "bg-blue-600 text-white" : "bg-white border border-gray-200"
              )}>
                <Edit size={16} className={editMode ? "text-white" : "text-gray-500"} />
                <Label 
                  htmlFor="edit-mode" 
                  className={cn(
                    "text-sm font-medium cursor-pointer",
                    editMode ? "text-white" : "text-gray-700"
                  )}
                >
                  Modo edición
                </Label>
                <Switch
                  id="edit-mode"
                  checked={editMode}
                  onCheckedChange={setEditMode}
                  className="data-[state=checked]:bg-white data-[state=checked]:text-blue-600"
                />
              </div>
              {editMode && (
                <span className="text-sm text-blue-700 font-medium">
                  ✓ Edición activa - arrastra elementos para reordenar
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/courses/${courseId}/edit`)}>
                <Settings size={14} className="mr-1" /> Configuración
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/courses/${courseId}/enrollments`)}>
                <Users size={14} className="mr-1" /> Matriculaciones
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/courses/${courseId}?preview=true`)}>
                <Eye size={14} className="mr-1" /> Vista estudiante
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left sidebar - Section index */}
        <div className="col-span-12 lg:col-span-3">
          <Card className="sticky top-20">
            <CardContent className="p-0">
              <div className="p-3 border-b">
                <h3 className="font-medium text-gray-900">Índice del curso</h3>
              </div>
              <ScrollArea className="h-[500px]">
                <nav className="p-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-md transition-colors",
                        activeSection === section.id
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-600 hover:bg-gray-50",
                        !section.visible && editMode && "opacity-50"
                      )}
                    >
                      {editMode && (
                        <span className={section.visible ? "text-blue-500" : "text-gray-400"}>
                          {section.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </span>
                      )}
                      <span className="truncate flex-1">
                        {section.position === 0 ? section.title : `${section.position}. ${section.title}`}
                      </span>
                      <ChevronRight size={14} className="text-gray-400" />
                    </button>
                  ))}
                </nav>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Main content - Sections */}
        <div className="col-span-12 lg:col-span-9 space-y-4">
          {sections.map((section) => {
            const items = sectionItems[section.id] || [];
            const isExpanded = expandedSections[section.id];
            const showSection = section.visible || editMode;
            
            if (!showSection) return null;
            
            return (
              <Card 
                key={section.id} 
                id={`section-${section.id}`}
                className={cn(
                  !section.visible && "border-dashed opacity-60"
                )}
              >
                {/* Section header */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center gap-3">
                    {editMode && (
                      <GripVertical size={16} className="text-gray-400 cursor-grab" />
                    )}
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {section.position === 0 ? section.title : `Tema ${section.position}: ${section.title}`}
                      </h3>
                      {section.summary && (
                        <p className="text-sm text-gray-500 mt-0.5">{section.summary}</p>
                      )}
                    </div>
                  </div>
                  
                  {editMode && (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <VisibilityToggle
                        visible={section.visible}
                        onToggle={() => handleToggleSectionVisibility(section)}
                      />
                      <ContextMenu items={[
                        { icon: Edit, label: 'Editar sección', onClick: () => {} },
                        { icon: Plus, label: 'Añadir actividad', onClick: () => navigate(`/courses/${courseId}/sections/${section.id}/items/new`) },
                        { separator: true },
                        { icon: Trash2, label: 'Eliminar', destructive: true, onClick: () => {} },
                      ]} />
                    </div>
                  )}
                </div>

                {/* Section items */}
                {isExpanded && (
                  <div className="border-t">
                    {items.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <p className="text-sm">Esta sección no tiene contenido</p>
                        {editMode && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3"
                            onClick={() => navigate(`/courses/${courseId}/sections/${section.id}/items/new`)}
                          >
                            <Plus size={14} className="mr-1" /> Añadir recurso
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {items.map((item) => {
                          const showItem = item.visible || editMode;
                          if (!showItem) return null;
                          
                          const ItemIcon = getItemIcon(item.item_type);
                          
                          return (
                            <div 
                              key={item.id}
                              className={cn(
                                "flex items-center justify-between p-3 hover:bg-gray-50 transition-colors",
                                !item.visible && "opacity-50 bg-gray-50/50"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                {editMode && (
                                  <GripVertical size={14} className="text-gray-400 cursor-grab" />
                                )}
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center",
                                  item.item_type === 'quiz' && "bg-purple-100 text-purple-600",
                                  item.item_type === 'assignment' && "bg-orange-100 text-orange-600",
                                  item.item_type === 'forum' && "bg-green-100 text-green-600",
                                  !['quiz', 'assignment', 'forum'].includes(item.item_type) && "bg-blue-100 text-blue-600"
                                )}>
                                  <ItemIcon size={16} />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                  {item.description && (
                                    <p className="text-xs text-gray-500">{item.description}</p>
                                  )}
                                </div>
                              </div>
                              
                              {editMode && (
                                <div className="flex items-center gap-2">
                                  <VisibilityToggle
                                    visible={item.visible}
                                    onToggle={() => handleToggleItemVisibility(item)}
                                  />
                                  <ContextMenu items={[
                                    { icon: Edit, label: 'Editar', onClick: () => navigate(`/courses/${courseId}/items/${item.id}/edit`) },
                                    { icon: Copy, label: 'Duplicar', onClick: () => handleDuplicateItem(item) },
                                    { separator: true },
                                    { icon: item.visible ? EyeOff : Eye, label: item.visible ? 'Ocultar' : 'Mostrar', onClick: () => handleToggleItemVisibility(item) },
                                    { separator: true },
                                    { icon: Trash2, label: 'Eliminar', destructive: true, onClick: () => handleDeleteItem(item) },
                                  ]} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {/* Add item button */}
                        {editMode && (
                          <div className="p-3">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="w-full justify-start text-gray-500 hover:text-gray-700"
                              onClick={() => navigate(`/courses/${courseId}/sections/${section.id}/items/new`)}
                            >
                              <Plus size={14} className="mr-2" /> Añadir actividad o recurso
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {/* Add section button */}
          {editMode && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => toast.info('Funcionalidad próximamente')}
            >
              <Plus size={16} className="mr-2" /> Añadir nueva sección
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseView;
