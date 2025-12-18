import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesApi, enrollmentsApi, usersApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import ContextMenu from '@/components/common/ContextMenu';
import { ArrowLeft, UserPlus, Users, GraduationCap, Edit, UserX, Trash2, Copy, Search } from 'lucide-react';

const CourseEnrollments = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');
  const [searchQuery, setSearchQuery] = useState('');
  const [enrollmentCode, setEnrollmentCode] = useState(null);

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [courseData, enrollmentsData, usersData] = await Promise.all([
        coursesApi.get(courseId),
        enrollmentsApi.list(courseId, {}),
        usersApi.list({ limit: 100 })
      ]);
      
      setCourse(courseData);
      setEnrollments(enrollmentsData);
      
      // Filter out already enrolled users
      const enrolledIds = new Set(enrollmentsData.map(e => e.user_id));
      setAvailableUsers(usersData.filter(u => !enrolledIds.has(u.id)));
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedUserId) {
      toast.error('Selecciona un usuario');
      return;
    }
    
    try {
      await enrollmentsApi.create(courseId, {
        course_id: courseId,
        user_id: selectedUserId,
        role: selectedRole
      });
      toast.success('Usuario matriculado');
      setDialogOpen(false);
      setSelectedUserId('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al matricular');
    }
  };

  const handleUnenroll = async (enrollment) => {
    if (!window.confirm(`¿Dar de baja a ${enrollment.user?.first_name} ${enrollment.user?.last_name}?`)) return;
    
    try {
      await enrollmentsApi.delete(enrollment.id);
      toast.success('Matriculación eliminada');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar matriculación');
    }
  };

  const handleChangeRole = async (enrollment, newRole) => {
    try {
      await enrollmentsApi.update(enrollment.id, { role: newRole });
      toast.success('Rol actualizado');
      loadData();
    } catch (error) {
      toast.error('Error al actualizar rol');
    }
  };

  const handleGenerateCode = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/courses/${courseId}/enrollment-methods`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ method_type: 'code' })
        }
      );
      const data = await response.json();
      setEnrollmentCode(data.code);
      toast.success('Código generado');
    } catch (error) {
      toast.error('Error al generar código');
    }
  };

  const getInitials = (user) => {
    return `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();
  };

  const filteredUsers = availableUsers.filter(u => 
    searchQuery === '' ||
    u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      key: 'user',
      header: 'Usuario',
      render: (enrollment) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-100 text-blue-700">
              {getInitials(enrollment.user)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-gray-900">
              {enrollment.user?.first_name} {enrollment.user?.last_name}
            </div>
            <div className="text-sm text-gray-500">{enrollment.user?.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Rol en el curso',
      render: (enrollment) => <StatusBadge status={enrollment.role} />
    },
    {
      key: 'status',
      header: 'Estado',
      render: (enrollment) => <StatusBadge status={enrollment.status} />
    },
    {
      key: 'progress',
      header: 'Progreso',
      render: (enrollment) => (
        <div className="flex items-center gap-2">
          <Progress value={enrollment.progress_percentage || 0} className="h-2 w-20" />
          <span className="text-sm text-gray-500">{enrollment.progress_percentage || 0}%</span>
        </div>
      )
    },
    {
      key: 'enrolled_at',
      header: 'Matriculado',
      render: (enrollment) => new Date(enrollment.enrolled_at).toLocaleDateString('es-ES')
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      render: (enrollment) => (
        <ContextMenu items={[
          { icon: Edit, label: 'Cambiar a Profesor', onClick: () => handleChangeRole(enrollment, 'teacher'), hidden: enrollment.role === 'teacher' },
          { icon: Edit, label: 'Cambiar a Editor', onClick: () => handleChangeRole(enrollment, 'editor'), hidden: enrollment.role === 'editor' },
          { icon: Edit, label: 'Cambiar a Estudiante', onClick: () => handleChangeRole(enrollment, 'student'), hidden: enrollment.role === 'student' },
          { separator: true },
          { icon: Trash2, label: 'Dar de baja', destructive: true, onClick: () => handleUnenroll(enrollment) },
        ]} />
      )
    }
  ];

  const stats = {
    total: enrollments.length,
    teachers: enrollments.filter(e => e.role === 'teacher').length,
    editors: enrollments.filter(e => e.role === 'editor').length,
    students: enrollments.filter(e => e.role === 'student').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs items={[
          { label: 'Cursos', href: '/courses' },
          { label: course?.shortname || courseId, href: `/courses/${courseId}` },
          { label: 'Matriculaciones' }
        ]} />
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Matriculaciones</h1>
            <p className="text-gray-500 mt-1">{course?.fullname}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
              <ArrowLeft size={16} className="mr-2" />
              Volver al curso
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <UserPlus size={16} className="mr-2" />
              Matricular usuario
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Users size={20} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Profesores</p>
              <p className="text-2xl font-bold text-blue-600">{stats.teachers}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Editores</p>
              <p className="text-2xl font-bold text-purple-600">{stats.editors}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <GraduationCap size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Estudiantes</p>
              <p className="text-2xl font-bold text-green-600">{stats.students}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Self-enrollment code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auto-matriculación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {enrollmentCode ? (
              <div className="flex items-center gap-3">
                <code className="px-4 py-2 bg-gray-100 rounded-lg text-lg font-mono">
                  {enrollmentCode}
                </code>
                <Button variant="ghost" size="sm" onClick={() => {
                  navigator.clipboard.writeText(enrollmentCode);
                  toast.success('Código copiado');
                }}>
                  <Copy size={16} />
                </Button>
              </div>
            ) : (
              <p className="text-gray-500">No hay código de auto-matriculación activo</p>
            )}
            <Button variant="outline" onClick={handleGenerateCode}>
              {enrollmentCode ? 'Generar nuevo código' : 'Generar código'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enrollments table */}
      <DataTable
        columns={columns}
        data={enrollments}
        loading={loading}
        emptyMessage="No hay usuarios matriculados"
      />

      {/* Enroll dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Matricular usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Buscar usuario</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o email..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="max-h-48 overflow-y-auto border rounded-lg">
              {filteredUsers.length === 0 ? (
                <p className="p-4 text-center text-gray-500">No hay usuarios disponibles</p>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 border-b last:border-0 ${
                      selectedUserId === user.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gray-100 text-gray-700 text-sm">
                        {getInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user.first_name} {user.last_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Rol en el curso</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Estudiante</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="teacher">Profesor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEnroll} disabled={!selectedUserId}>Matricular</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseEnrollments;
