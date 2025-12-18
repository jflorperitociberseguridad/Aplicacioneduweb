import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi, enrollmentsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import StatusBadge from '@/components/common/StatusBadge';
import {
  ArrowLeft,
  Save,
  User,
  BookOpen,
  Clock,
  Mail,
  Phone,
  Globe,
  Shield,
  Calendar
} from 'lucide-react';

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isAdmin } = useAuth();
  
  const [user, setUser] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({});
  
  const isOwnProfile = currentUser?.id === userId;
  const canEdit = isOwnProfile || isAdmin();

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const userData = await usersApi.get(userId);
      setUser(userData);
      setEditData({
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone || '',
        language: userData.language || 'es',
        timezone: userData.timezone || 'Europe/Madrid',
        role: userData.role,
        status: userData.status
      });
      
      // Load enrollments
      try {
        const enrollData = await enrollmentsApi.myEnrollments();
        setEnrollments(enrollData.filter(e => e.user_id === userId) || enrollData);
      } catch (e) {
        // User might not have permission to see enrollments
      }
    } catch (error) {
      toast.error('Error al cargar el usuario');
      navigate('/users');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await usersApi.update(userId, editData);
      toast.success('Perfil actualizado');
      loadUser();
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    if (!user) return 'U';
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="col-span-2 h-64" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs items={[
          { label: 'Usuarios', href: '/users' },
          { label: `${user.first_name} ${user.last_name}` }
        ]} />
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user.first_name} {user.last_name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={user.role} />
                <StatusBadge status={user.status} />
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} className="mr-2" />
            Volver
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - Quick info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información de contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail size={16} className="text-gray-400" />
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={16} className="text-gray-400" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Globe size={16} className="text-gray-400" />
                <span>{user.language === 'es' ? 'Español' : user.language}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock size={16} className="text-gray-400" />
                <span>{user.timezone}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actividad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Último acceso</span>
                <span>{user.last_login ? new Date(user.last_login).toLocaleDateString('es-ES') : 'Nunca'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Registrado</span>
                <span>{new Date(user.created_at).toLocaleDateString('es-ES')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Cursos activos</span>
                <span className="font-medium">{enrollments.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Perfil</TabsTrigger>
              <TabsTrigger value="courses">Cursos ({enrollments.length})</TabsTrigger>
              {isAdmin() && <TabsTrigger value="admin">Administración</TabsTrigger>}
            </TabsList>

            <TabsContent value="profile" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Datos personales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nombre</Label>
                      <Input
                        value={editData.first_name}
                        onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                        disabled={!canEdit}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Apellidos</Label>
                      <Input
                        value={editData.last_name}
                        onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                        disabled={!canEdit}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      disabled={!canEdit}
                      className="mt-1"
                      placeholder="+34 600 000 000"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Idioma</Label>
                      <Select
                        value={editData.language}
                        onValueChange={(value) => setEditData({ ...editData, language: value })}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ca">Català</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Zona horaria</Label>
                      <Select
                        value={editData.timezone}
                        onValueChange={(value) => setEditData({ ...editData, timezone: value })}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Europe/Madrid">Europa/Madrid</SelectItem>
                          <SelectItem value="Europe/London">Europa/Londres</SelectItem>
                          <SelectItem value="America/New_York">América/Nueva York</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="pt-4 flex justify-end">
                      <Button onClick={handleSave} disabled={saving}>
                        <Save size={16} className="mr-2" />
                        Guardar cambios
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="courses" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cursos matriculados</CardTitle>
                </CardHeader>
                <CardContent>
                  {enrollments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No hay cursos matriculados</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {enrollments.map((enrollment) => (
                        <div 
                          key={enrollment.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/courses/${enrollment.course_id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium">{enrollment.course?.fullname || 'Curso'}</h4>
                              <p className="text-sm text-gray-500">
                                Rol: {enrollment.role} • {enrollment.status}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{enrollment.progress_percentage || 0}%</p>
                            <Progress value={enrollment.progress_percentage || 0} className="h-2 w-24" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {isAdmin() && (
              <TabsContent value="admin" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield size={18} />
                      Administración
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Rol global</Label>
                      <Select
                        value={editData.role}
                        onValueChange={(value) => setEditData({ ...editData, role: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="teacher">Profesor</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="student">Estudiante</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Estado de la cuenta</Label>
                      <Select
                        value={editData.status}
                        onValueChange={(value) => setEditData({ ...editData, status: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Activo</SelectItem>
                          <SelectItem value="inactive">Inactivo</SelectItem>
                          <SelectItem value="suspended">Suspendido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button onClick={handleSave} disabled={saving}>
                        <Save size={16} className="mr-2" />
                        Guardar cambios
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
