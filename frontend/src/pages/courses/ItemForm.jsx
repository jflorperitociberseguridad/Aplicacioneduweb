import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { itemsApi, sectionsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import CollapsibleSection from '@/components/common/CollapsibleSection';
import { Loader2, Save, ArrowLeft, FileText, File, Video, Link as LinkIcon, MessageSquare, ClipboardCheck, HelpCircle, ClipboardList } from 'lucide-react';

const ITEM_TYPES = [
  { value: 'page', label: 'Página', icon: FileText, description: 'Contenido HTML/texto' },
  { value: 'file', label: 'Archivo', icon: File, description: 'PDF, documento, etc.' },
  { value: 'url', label: 'URL/Enlace', icon: LinkIcon, description: 'Enlace externo' },
  { value: 'video', label: 'Video', icon: Video, description: 'Video embebido' },
  { value: 'forum', label: 'Foro', icon: MessageSquare, description: 'Foro de discusión' },
  { value: 'assignment', label: 'Tarea', icon: ClipboardCheck, description: 'Entrega de trabajos' },
  { value: 'quiz', label: 'Cuestionario', icon: HelpCircle, description: 'Test/examen' },
  { value: 'feedback', label: 'Encuesta', icon: ClipboardList, description: 'Formulario de feedback' },
];

const itemSchema = z.object({
  title: z.string().min(2, 'El título debe tener al menos 2 caracteres'),
  item_type: z.string().min(1, 'Selecciona un tipo'),
  description: z.string().optional(),
  visible: z.boolean().default(true),
  content: z.object({
    html: z.string().optional(),
    url: z.string().optional(),
    file_url: z.string().optional(),
  }).optional(),
});

const ItemForm = () => {
  const { courseId, sectionId, itemId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!itemId;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset
  } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      title: '',
      item_type: 'page',
      description: '',
      visible: true,
      content: { html: '', url: '' }
    }
  });

  const watchType = watch('item_type');

  useEffect(() => {
    loadSection();
    if (isEditing) {
      loadItem();
    }
  }, [sectionId, itemId]);

  const loadSection = async () => {
    try {
      const data = await sectionsApi.get(courseId, sectionId);
      setSection(data);
    } catch (error) {
      toast.error('Error al cargar la sección');
    }
  };

  const loadItem = async () => {
    setLoading(true);
    try {
      const data = await itemsApi.get(itemId);
      reset({
        title: data.title,
        item_type: data.item_type,
        description: data.description || '',
        visible: data.visible,
        content: data.content || { html: '', url: '' }
      });
    } catch (error) {
      toast.error('Error al cargar el item');
      navigate(`/courses/${courseId}`);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      if (isEditing) {
        await itemsApi.update(itemId, data);
        toast.success('Recurso actualizado');
      } else {
        await itemsApi.create(sectionId, { ...data, section_id: sectionId });
        toast.success('Recurso creado');
      }
      navigate(`/courses/${courseId}`);
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al guardar';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const getTypeIcon = (type) => {
    const found = ITEM_TYPES.find(t => t.value === type);
    return found?.icon || FileText;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <Breadcrumbs items={[
          { label: 'Cursos', href: '/courses' },
          { label: courseId, href: `/courses/${courseId}` },
          { label: section?.title || 'Sección' },
          { label: isEditing ? 'Editar recurso' : 'Nuevo recurso' }
        ]} />
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Editar recurso' : 'Añadir actividad o recurso'}
            </h1>
            <p className="text-gray-500 mt-1">
              Sección: {section?.title}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
            <ArrowLeft size={16} className="mr-2" />
            Volver al curso
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Type selector */}
        {!isEditing && (
          <Card>
            <CardContent className="pt-6">
              <Label className="text-base font-medium">Tipo de recurso</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {ITEM_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = watchType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setValue('item_type', type.value)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={24} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />
                      <p className={`font-medium mt-2 ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                        {type.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* General info */}
        <CollapsibleSection title="Información general" defaultOpen={true}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Ej: Introducción al tema"
                className="mt-1"
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Descripción breve</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Descripción opcional que aparecerá bajo el título"
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-base">Visible para estudiantes</Label>
                <p className="text-sm text-gray-500">Los estudiantes podrán ver este recurso</p>
              </div>
              <Switch
                checked={watch('visible')}
                onCheckedChange={(checked) => setValue('visible', checked)}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Content based on type */}
        <CollapsibleSection title="Contenido" defaultOpen={true}>
          {watchType === 'page' && (
            <div>
              <Label>Contenido HTML</Label>
              <Textarea
                {...register('content.html')}
                placeholder="<p>Escribe el contenido aquí...</p>"
                className="mt-1 font-mono text-sm"
                rows={10}
              />
              <p className="text-xs text-gray-500 mt-1">Puedes usar HTML básico</p>
            </div>
          )}

          {watchType === 'url' && (
            <div>
              <Label>URL del enlace</Label>
              <Input
                {...register('content.url')}
                placeholder="https://ejemplo.com"
                className="mt-1"
              />
            </div>
          )}

          {watchType === 'video' && (
            <div>
              <Label>URL del video (YouTube, Vimeo, etc.)</Label>
              <Input
                {...register('content.url')}
                placeholder="https://www.youtube.com/watch?v=..."
                className="mt-1"
              />
            </div>
          )}

          {watchType === 'file' && (
            <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <File size={32} className="mx-auto text-gray-400" />
              <p className="mt-2 text-gray-600">Subida de archivos</p>
              <p className="text-sm text-gray-400">Funcionalidad próximamente</p>
            </div>
          )}

          {['forum', 'assignment', 'quiz', 'feedback'].includes(watchType) && (
            <div className="p-6 bg-gray-50 rounded-lg text-center">
              <p className="text-gray-600">Configuración avanzada para {ITEM_TYPES.find(t => t.value === watchType)?.label}</p>
              <p className="text-sm text-gray-400 mt-1">Se configurará en la siguiente pantalla</p>
            </div>
          )}
        </CollapsibleSection>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/courses/${courseId}`)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save size={16} className="mr-2" />
                {isEditing ? 'Guardar cambios' : 'Crear recurso'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default ItemForm;
