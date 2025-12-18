import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import { ArrowLeft, Download, Save, ClipboardCheck, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const Gradebook = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [gradebook, setGradebook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gradeDialog, setGradeDialog] = useState({ open: false, student: null, item: null });
  const [gradeValue, setGradeValue] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    loadGradebook();
  }, [courseId]);

  const loadGradebook = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/courses/${courseId}/gradebook`);
      setGradebook(data);
    } catch (error) {
      toast.error('Error al cargar el libro de calificaciones');
    } finally {
      setLoading(false);
    }
  };

  const openGradeDialog = (student, item) => {
    const currentGrade = student.grades[item.id];
    setGradeValue(currentGrade?.grade?.toString() || '');
    setFeedback(currentGrade?.feedback || '');
    setGradeDialog({ open: true, student, item });
  };

  const handleSaveGrade = async () => {
    const grade = parseFloat(gradeValue);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      toast.error('La calificación debe ser un número entre 0 y 100');
      return;
    }

    try {
      await api.post('/grades', null, {
        params: {
          user_id: gradeDialog.student.user_id,
          item_id: gradeDialog.item.id,
          course_id: courseId,
          grade,
          feedback: feedback || undefined
        }
      });
      toast.success('Calificación guardada');
      setGradeDialog({ open: false, student: null, item: null });
      loadGradebook();
    } catch (error) {
      toast.error('Error al guardar la calificación');
    }
  };

  const getGradeColor = (grade) => {
    if (grade === null || grade === undefined) return 'text-gray-400';
    if (grade >= 90) return 'text-green-600 font-semibold';
    if (grade >= 70) return 'text-blue-600';
    if (grade >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getInitials = (user) => {
    return `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();
  };

  const exportToCSV = () => {
    if (!gradebook) return;
    
    const headers = ['Estudiante', 'Email', ...gradebook.items.map(i => i.title), 'Promedio'];
    const rows = gradebook.students.map(s => [
      `${s.user.first_name} ${s.user.last_name}`,
      s.user.email,
      ...gradebook.items.map(i => s.grades[i.id]?.grade ?? '-'),
      s.average ?? '-'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calificaciones-${courseId}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando...</div>;
  }

  if (!gradebook) {
    return <div className="p-8 text-center text-gray-500">No se pudo cargar el libro de calificaciones</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs items={[
          { label: 'Cursos', href: '/courses' },
          { label: gradebook.course.fullname, href: `/courses/${courseId}` },
          { label: 'Libro de calificaciones' }
        ]} />
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Libro de calificaciones</h1>
            <p className="text-gray-500 mt-1">{gradebook.course.fullname}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
              <ArrowLeft size={16} className="mr-2" />
              Volver al curso
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download size={16} className="mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Estudiantes</p>
          <p className="text-2xl font-bold">{gradebook.students.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Actividades evaluables</p>
          <p className="text-2xl font-bold">{gradebook.items.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Promedio del curso</p>
          <p className="text-2xl font-bold">
            {gradebook.students.length > 0
              ? (gradebook.students.reduce((sum, s) => sum + (s.average || 0), 0) / gradebook.students.filter(s => s.average).length || 0).toFixed(1)
              : '-'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Aprobación mínima</p>
          <p className="text-2xl font-bold">{gradebook.gradebook_settings?.passing_grade || 60}%</p>
        </Card>
      </div>

      {/* Gradebook table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="sticky left-0 bg-gray-50 z-10 min-w-[200px]">Estudiante</TableHead>
                {gradebook.items.map(item => (
                  <TableHead key={item.id} className="text-center min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      {item.item_type === 'quiz' ? (
                        <HelpCircle size={14} className="text-purple-500" />
                      ) : (
                        <ClipboardCheck size={14} className="text-orange-500" />
                      )}
                      <span className="text-xs font-normal truncate max-w-[100px]">
                        {item.title}
                      </span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-center bg-blue-50">Promedio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gradebook.students.map(student => (
                <TableRow key={student.user_id} className="hover:bg-gray-50">
                  <TableCell className="sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                          {getInitials(student.user)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {student.user.first_name} {student.user.last_name}
                        </p>
                        <p className="text-xs text-gray-400">{student.user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  {gradebook.items.map(item => {
                    const grade = student.grades[item.id];
                    return (
                      <TableCell 
                        key={item.id} 
                        className="text-center cursor-pointer hover:bg-blue-50"
                        onClick={() => openGradeDialog(student, item)}
                      >
                        <span className={cn("text-sm", getGradeColor(grade?.grade))}>
                          {grade?.grade !== null && grade?.grade !== undefined
                            ? `${grade.grade}%`
                            : '-'}
                        </span>
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center bg-blue-50/50">
                    <span className={cn("font-semibold", getGradeColor(student.average))}>
                      {student.average !== null ? `${student.average}%` : '-'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Grade dialog */}
      <Dialog open={gradeDialog.open} onOpenChange={(open) => setGradeDialog({ ...gradeDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calificar actividad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-gray-500">Estudiante</p>
              <p className="font-medium">
                {gradeDialog.student?.user.first_name} {gradeDialog.student?.user.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Actividad</p>
              <p className="font-medium">{gradeDialog.item?.title}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Calificación (0-100)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={gradeValue}
                onChange={(e) => setGradeValue(e.target.value)}
                className="mt-1"
                placeholder="Ej: 85"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Retroalimentación (opcional)</label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="mt-1"
                placeholder="Comentarios para el estudiante..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradeDialog({ open: false, student: null, item: null })}>
              Cancelar
            </Button>
            <Button onClick={handleSaveGrade}>
              <Save size={16} className="mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Gradebook;
