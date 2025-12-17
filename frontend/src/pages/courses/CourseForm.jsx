import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { coursesApi, categoriesApi } from '@/services/api';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import CollapsibleSection from '@/components/common/CollapsibleSection';
import { Loader2, Save, ArrowLeft, BookOpen, Settings, Eye, CheckCircle } from 'lucide-react';

const courseSchema = z.object({
  fullname: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  shortname: z.string().min(2, 'El nombre corto debe tener al menos 2 caracteres').max(20),
  category_id: z.string().min(1, 'Selecciona una categoría'),
  summary: z.string().optional(),
  language: z.string().default('es'),
  format: z.enum(['topics', 'weeks', 'free']).default('topics'),
  num_sections: z.number().min(1).max(52).default(5),
  visible: z.boolean().default(true),
  status: z.enum(['draft', 'published', 'suspended', 'archived']).default('draft'),
});

const CourseForm = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!courseId;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [course, setCourse] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset
  } = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      fullname: '',
      shortname: '',
      category_id: '',
      summary: '',
      language: 'es',
      format: 'topics',
      num_sections: 5,
      visible: true,
      status: 'draft'
    }
  });

  const watchFormat = watch('format');
  const watchStatus = watch('status');
  const watchVisible = watch('visible');

  useEffect(() => {
    loadCategories();
    if (isEditing) {
      loadCourse();
    }
  }, [courseId]);

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.list({});
      setCategories(data);
    } catch (error) {
      toast.error('Error al cargar categorías');
    }
  };

  const loadCourse = async () => {
    setLoading(true);
    try {
      const data = await coursesApi.get(courseId);
      setCourse(data);
      reset({
        fullname: data.fullname,
        shortname: data.shortname,
        category_id: data.category_id,
        summary: data.summary || '',
        language: data.language || 'es',
        format: data.format || 'topics',
        num_sections: data.num_sections || 5,
        visible: data.visible,
        status: data.status
      });
    } catch (error) {
      toast.error('Error al cargar el curso');
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      if (isEditing) {
        await coursesApi.update(courseId, data);
        toast.success('Curso actualizado');
      } else {
        const newCourse = await coursesApi.create(data);
        toast.success('Curso creado');
        navigate(`/courses/${newCourse.id}`);
        return;
      }
      navigate(`/courses/${courseId}`);
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al guardar';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <Breadcrumbs items={[
          { label: 'Cursos', href: '/courses' },
          { label: isEditing ? 'Editar curso' : 'Nuevo curso' }
        ]} />
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Editar curso' : 'Crear nuevo curso'}
            </h1>
            <p className="text-gray-500 mt-1">
              {isEditing ? 'Modifica la configuración del curso' : 'Configura los ajustes básicos del nuevo curso'}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} className="mr-2" />
            Volver
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* General */}
        <CollapsibleSection title="General" icon={BookOpen} defaultOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="fullname">Nombre completo del curso *</Label>
              <Input
                id="fullname"
                {...register('fullname')}
                placeholder="Ej: Introducción a la Programación"
                className="mt-1"
              />
              {errors.fullname && (
                <p className="text-sm text-red-500 mt-1">{errors.fullname.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="shortname">Nombre corto *</Label>
              <Input
                id="shortname"
                {...register('shortname')}
                placeholder="Ej: PROG-101"
                className="mt-1"
                disabled={isEditing && course?.status === 'archived'}
              />
              {errors.shortname && (
                <p className="text-sm text-red-500 mt-1">{errors.shortname.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="category_id">Categoría *</Label>
              <Select
                value={watch('category_id')}
                onValueChange={(value) => setValue('category_id', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-sm text-red-500 mt-1">{errors.category_id.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="summary">Resumen del curso</Label>
              <Textarea
                id="summary"
                {...register('summary')}
                placeholder="Describe brevemente el contenido del curso..."
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="language">Idioma</Label>
              <Select
                value={watch('language')}
                onValueChange={(value) => setValue('language', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">Inglés</SelectItem>
                  <SelectItem value="ca">Catalán</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleSection>

        {/* Format */}
        <CollapsibleSection title="Formato del curso" icon={Settings} defaultOpen={!isEditing}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Formato</Label>
              <Select
                value={watchFormat}
                onValueChange={(value) => setValue('format', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="topics">Por temas</SelectItem>
                  <SelectItem value="weeks">Por semanas</SelectItem>
                  <SelectItem value="free">Formato libre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="num_sections">Número de secciones</Label>
              <Input
                id="num_sections"
                type="number"
                min="1"
                max="52"
                {...register('num_sections', { valueAsNumber: true })}
                className="mt-1"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Visibility & Status */}
        <CollapsibleSection title="Disponibilidad y acceso" icon={Eye} defaultOpen={true}>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-base">Visible para estudiantes</Label>
                <p className="text-sm text-gray-500">Los estudiantes podrán ver este curso en el catálogo</p>
              </div>
              <Switch
                checked={watchVisible}
                onCheckedChange={(checked) => setValue('visible', checked)}
              />
            </div>

            <div>
              <Label>Estado interno</Label>
              <Select
                value={watchStatus}
                onValueChange={(value) => setValue('status', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                  <SelectItem value="suspended">Suspendido</SelectItem>
                  <SelectItem value="archived">Archivado</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-2">
                {watchStatus === 'draft' && 'El curso está en preparación. Solo los editores pueden verlo.'}
                {watchStatus === 'published' && 'El curso está activo y disponible según la configuración de visibilidad.'}
                {watchStatus === 'suspended' && 'El acceso de estudiantes está bloqueado temporalmente.'}
                {watchStatus === 'archived' && 'El curso es de solo lectura. No se puede editar.'}
              </p>
            </div>

            {/* Coherence warning */}
            {!watchVisible && watchStatus === 'published' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ El curso está publicado pero oculto. Los estudiantes matriculados podrán acceder, pero no aparecerá en el catálogo.
                </p>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancelar
              </Button>
              <div className="flex gap-3">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save size={16} className="mr-2" />
                  {isEditing ? 'Guardar cambios' : 'Crear curso'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default CourseForm;
