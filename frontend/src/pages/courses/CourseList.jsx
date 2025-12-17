import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { coursesApi, categoriesApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import DataTable from '@/components/common/DataTable';
import FilterPanel from '@/components/common/FilterPanel';
import StatusBadge from '@/components/common/StatusBadge';
import VisibilityToggle from '@/components/common/VisibilityToggle';
import ContextMenu from '@/components/common/ContextMenu';
import {
  Plus,
  BookOpen,
  LayoutGrid,
  LayoutList,
  Copy,
  Edit,
  Eye,
  Archive,
  Pause,
  Trash2,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CourseList = () => {
  const navigate = useNavigate();
  const { isAdmin, isTeacher } = useAuth();
  
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('table');
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    visible: 'all',
    category_id: 'all'
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadCourses();
  }, [filters]);

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.list({});
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.visible !== 'all') params.visible = filters.visible === 'visible';
      if (filters.category_id !== 'all') params.category_id = filters.category_id;
      
      const data = await coursesApi.list(params);
      setCourses(data);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Error al cargar los cursos');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (course) => {
    try {
      await coursesApi.update(course.id, { visible: !course.visible });
      loadCourses();
      toast.success(course.visible ? 'Curso ocultado' : 'Curso visible');
    } catch (error) {
      toast.error('Error al cambiar visibilidad');
    }
  };

  const handleDuplicate = async (course) => {
    try {
      const newShortname = `${course.shortname}-COPIA`;
      await coursesApi.duplicate(course.id, newShortname);
      loadCourses();
      toast.success('Curso duplicado correctamente');
    } catch (error) {
      toast.error('Error al duplicar el curso');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return;
    
    try {
      await coursesApi.bulk(selectedIds, action);
      setSelectedIds([]);
      loadCourses();
      toast.success(`Acción aplicada a ${selectedIds.length} cursos`);
    } catch (error) {
      toast.error('Error al aplicar la acción');
    }
  };

  const handleDelete = async () => {
    if (!courseToDelete) return;
    
    try {
      await coursesApi.delete(courseToDelete.id);
      loadCourses();
      toast.success('Curso eliminado');
    } catch (error) {
      toast.error('Error al eliminar el curso');
    } finally {
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || '-';
  };

  const getContextMenuItems = (course) => [
    { icon: Edit, label: 'Editar curso', onClick: () => navigate(`/courses/${course.id}/edit`) },
    { icon: Eye, label: 'Ver como estudiante', onClick: () => navigate(`/courses/${course.id}?preview=true`) },
    { icon: Copy, label: 'Duplicar', onClick: () => handleDuplicate(course) },
    { separator: true },
    { 
      icon: course.visible ? EyeOff : Eye, 
      label: course.visible ? 'Ocultar' : 'Mostrar', 
      onClick: () => handleToggleVisibility(course) 
    },
    { icon: Pause, label: 'Suspender', onClick: () => coursesApi.update(course.id, { status: 'suspended' }).then(loadCourses), hidden: course.status === 'suspended' },
    { icon: Archive, label: 'Archivar', onClick: () => coursesApi.update(course.id, { status: 'archived' }).then(loadCourses), hidden: course.status === 'archived' },
    { separator: true, hidden: !isAdmin() },
    { icon: Trash2, label: 'Eliminar', destructive: true, onClick: () => { setCourseToDelete(course); setDeleteDialogOpen(true); }, hidden: !isAdmin() },
  ];

  const columns = [
    {
      key: 'fullname',
      header: 'Nombre del curso',
      render: (course) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{course.fullname}</div>
            <div className="text-sm text-gray-500">{course.shortname}</div>
          </div>
        </div>
      )
    },
    {
      key: 'category',
      header: 'Categoría',
      render: (course) => getCategoryName(course.category_id)
    },
    {
      key: 'status',
      header: 'Estado',
      render: (course) => <StatusBadge status={course.status} />
    },
    {
      key: 'visible',
      header: 'Visible',
      render: (course) => (
        <VisibilityToggle
          visible={course.visible}
          onToggle={() => handleToggleVisibility(course)}
          disabled={course.status === 'archived'}
        />
      )
    },
    {
      key: 'updated_at',
      header: 'Última modificación',
      render: (course) => new Date(course.updated_at).toLocaleDateString('es-ES')
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      render: (course) => <ContextMenu items={getContextMenuItems(course)} />
    }
  ];

  const filterConfig = [
    {
      key: 'status',
      label: 'Estado',
      options: [
        { value: 'draft', label: 'Borrador' },
        { value: 'published', label: 'Publicado' },
        { value: 'suspended', label: 'Suspendido' },
        { value: 'archived', label: 'Archivado' },
      ]
    },
    {
      key: 'visible',
      label: 'Visibilidad',
      options: [
        { value: 'visible', label: 'Visible' },
        { value: 'hidden', label: 'Oculto' },
      ]
    },
    {
      key: 'category_id',
      label: 'Categoría',
      options: categories.map(c => ({ value: c.id, label: c.name }))
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs items={[{ label: 'Cursos', href: '/courses' }, { label: 'Gestión de cursos' }]} />
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de cursos</h1>
            <p className="text-gray-500 mt-1">Administra todos los cursos de la plataforma</p>
          </div>
          {(isTeacher() || isAdmin()) && (
            <Button onClick={() => navigate('/courses/new')} className="gap-2">
              <Plus size={16} />
              Añadir nuevo curso
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <FilterPanel
        filters={filterConfig}
        values={filters}
        onChange={setFilters}
        onClear={() => setFilters({ search: '', status: 'all', visible: 'all', category_id: 'all' })}
        onSearch={(search) => setFilters({ ...filters, search })}
        searchPlaceholder="Buscar por nombre del curso o nombre corto"
      />

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedIds.length} curso(s) seleccionado(s)
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('hide')}>
                <EyeOff size={14} className="mr-1" /> Ocultar
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('show')}>
                <Eye size={14} className="mr-1" /> Mostrar
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('archive')}>
                <Archive size={14} className="mr-1" /> Archivar
              </Button>
              {isAdmin() && (
                <Button variant="destructive" size="sm" onClick={() => handleBulkAction('delete')}>
                  <Trash2 size={14} className="mr-1" /> Eliminar
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* View toggle */}
      <div className="flex justify-end">
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="table" className="gap-2">
              <LayoutList size={16} /> Tabla
            </TabsTrigger>
            <TabsTrigger value="grid" className="gap-2">
              <LayoutGrid size={16} /> Tarjetas
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Course list */}
      {view === 'table' ? (
        <DataTable
          columns={columns}
          data={courses}
          loading={loading}
          selectable={isTeacher() || isAdmin()}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={(course) => navigate(`/courses/${course.id}`)}
          emptyMessage="No se encontraron cursos"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {courses.map((course) => (
            <Card
              key={course.id}
              className={cn(
                "overflow-hidden cursor-pointer hover:shadow-md transition-shadow",
                course.status === 'archived' && "opacity-60"
              )}
              onClick={() => navigate(`/courses/${course.id}`)}
            >
              {course.cover_image ? (
                <img
                  src={course.cover_image}
                  alt={course.fullname}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-white/80" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <StatusBadge status={course.status} />
                  <ContextMenu items={getContextMenuItems(course)} />
                </div>
                <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                  {course.fullname}
                </h3>
                <p className="text-sm text-gray-500">{course.shortname}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {getCategoryName(course.category_id)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar curso</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar el curso "{courseToDelete?.fullname}"?
              Esta acción no se puede deshacer y eliminará todos los contenidos, 
              matriculaciones y calificaciones asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CourseList;
