import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';

// Pages
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import CourseList from '@/pages/courses/CourseList';
import CourseForm from '@/pages/courses/CourseForm';
import CourseView from '@/pages/courses/CourseView';

import './App.css';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

// Public route wrapper (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Courses */}
      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <CourseList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/new"
        element={
          <ProtectedRoute>
            <CourseForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseId"
        element={
          <ProtectedRoute>
            <CourseView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:courseId/edit"
        element={
          <ProtectedRoute>
            <CourseForm />
          </ProtectedRoute>
        }
      />

      {/* Placeholder routes */}
      <Route
        path="/my-courses"
        element={
          <ProtectedRoute>
            <div className="text-center py-12"><h1 className="text-2xl font-bold">Mis Cursos</h1><p className="text-gray-500">Próximamente...</p></div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedRoute>
            <div className="text-center py-12"><h1 className="text-2xl font-bold">Categorías</h1><p className="text-gray-500">Próximamente...</p></div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <div className="text-center py-12"><h1 className="text-2xl font-bold">Usuarios</h1><p className="text-gray-500">Próximamente...</p></div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <div className="text-center py-12"><h1 className="text-2xl font-bold">Calendario</h1><p className="text-gray-500">Próximamente...</p></div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <div className="text-center py-12"><h1 className="text-2xl font-bold">Mensajes</h1><p className="text-gray-500">Próximamente...</p></div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <div className="text-center py-12"><h1 className="text-2xl font-bold">Informes</h1><p className="text-gray-500">Próximamente...</p></div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <div className="text-center py-12"><h1 className="text-2xl font-bold">Mi Perfil</h1><p className="text-gray-500">Próximamente...</p></div>
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
