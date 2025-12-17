import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { enrollmentsApi, coursesApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import StatusBadge from '@/components/common/StatusBadge';
import {
  BookOpen,
  Users,
  Calendar,
  TrendingUp,
  ArrowRight,
  Clock,
  GraduationCap
} from 'lucide-react';

const Dashboard = () => {
  const { user, isTeacher, isAdmin } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (isTeacher() || isAdmin()) {
        const coursesData = await coursesApi.list({ limit: 5 });
        setCourses(coursesData);
      }
      
      const enrollmentsData = await enrollmentsApi.myEnrollments();
      setEnrollments(enrollmentsData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          ¡Hola, {user?.first_name}!
        </h1>
        <p className="text-gray-500 mt-1">
          Bienvenido/a a tu aula virtual
        </p>
      </div>

      {/* Stats cards for teachers/admins */}
      {(isTeacher() || isAdmin()) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Cursos</p>
                  <p className="text-2xl font-bold">{courses.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Estudiantes</p>
                  <p className="text-2xl font-bold">--</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Eventos hoy</p>
                  <p className="text-2xl font-bold">--</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Actividad</p>
                  <p className="text-2xl font-bold">--</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* My courses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Mis Cursos
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/my-courses">
              Ver todos <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No estás matriculado en ningún curso</p>
              <Button variant="link" asChild className="mt-2">
                <Link to="/courses">Explorar cursos</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrollments.slice(0, 6).map((enrollment) => (
                <Link
                  key={enrollment.id}
                  to={`/courses/${enrollment.course_id}`}
                  className="block p-4 border rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  {enrollment.course?.cover_image && (
                    <img
                      src={enrollment.course.cover_image}
                      alt={enrollment.course.fullname}
                      className="w-full h-32 object-cover rounded-md mb-3"
                    />
                  )}
                  <h3 className="font-medium text-gray-900 mb-1">
                    {enrollment.course?.fullname || 'Curso'}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {enrollment.course?.shortname}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Progreso</span>
                      <span className="font-medium">{enrollment.progress_percentage || 0}%</span>
                    </div>
                    <Progress value={enrollment.progress_percentage || 0} className="h-2" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent courses for teachers */}
      {(isTeacher() || isAdmin()) && courses.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Cursos recientes
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/courses">
                Ver todos <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{course.fullname}</h4>
                      <p className="text-sm text-gray-500">{course.shortname}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={course.status} />
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
