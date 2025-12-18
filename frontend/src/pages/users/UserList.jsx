import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import ContextMenu from '@/components/common/ContextMenu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Plus,
  UserPlus,
  Edit,
  UserX,
  UserCheck,
  Shield,
  Trash2
} from 'lucide-react';

const UserList = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionDialog, setActionDialog] = useState({ open: false, action: '', user: null });
  
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    status: 'all'
  });

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.role !== 'all') params.role = filters.role;
      if (filters.status !== 'all') params.status = filters.status;
      
      const data = await usersApi.list(params);
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (user, newStatus) => {
    try {
      await usersApi.update(user.id, { status: newStatus });
      loadUsers();
      toast.success(`Usuario ${newStatus === 'active' ? 'activado' : 'desactivado'}`);
    } catch (error) {
      toast.error('Error al cambiar estado');
    }
    setActionDialog({ open: false, action: '', user: null });
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return;
    
    try {
      await usersApi.bulk(selectedIds, action);
      setSelectedIds([]);
      loadUsers();
      toast.success(`Acción aplicada a ${selectedIds.length} usuarios`);
    } catch (error) {
      toast.error('Error al aplicar la acción');
    }
  };

  const getInitials = (user) => {
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  };

  const getContextMenuItems = (user) => [
    { icon: Edit, label: 'Ver/Editar perfil', onClick: () => navigate(`/users/${user.id}`) },
    { separator: true },
    { 
      icon: user.status === 'active' ? UserX : UserCheck, 
      label: user.status === 'active' ? 'Desactivar' : 'Activar', 
      onClick: () => setActionDialog({ 
        open: true, 
        action: user.status === 'active' ? 'deactivate' : 'activate', 
        user 
      }),
      hidden: !isAdmin()
    },
    { icon: Shield, label: 'Cambiar rol', onClick: () => navigate(`/users/${user.id}?tab=role`), hidden: !isAdmin() },
  ];

  const columns = [
    {
      key: 'name',
      header: 'Usuario',
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-100 text-blue-700">
              {getInitials(user)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-gray-900">
              {user.first_name} {user.last_name}
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Rol',
      render: (user) => <StatusBadge status={user.role} />
    },
    {
      key: 'status',
      header: 'Estado',
      render: (user) => <StatusBadge status={user.status} />
    },
    {
      key: 'last_login',
      header: 'Último acceso',
      render: (user) => user.last_login 
        ? new Date(user.last_login).toLocaleDateString('es-ES')
        : 'Nunca'
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      render: (user) => <ContextMenu items={getContextMenuItems(user)} />
    }
  ];

  const filterConfig = [
    {
      key: 'role',
      label: 'Rol',
      options: [
        { value: 'admin', label: 'Administrador' },
        { value: 'teacher', label: 'Profesor' },
        { value: 'editor', label: 'Editor' },
        { value: 'student', label: 'Estudiante' },
      ]
    },
    {
      key: 'status',
      label: 'Estado',
      options: [
        { value: 'active', label: 'Activo' },
        { value: 'inactive', label: 'Inactivo' },
        { value: 'suspended', label: 'Suspendido' },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs items={[{ label: 'Usuarios', href: '/users' }, { label: 'Gestión de usuarios' }]} />
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de usuarios</h1>
            <p className="text-gray-500 mt-1">Administra los usuarios de la plataforma</p>
          </div>
          {isAdmin() && (
            <Button onClick={() => navigate('/users/new')} className="gap-2">
              <UserPlus size={16} />
              Añadir usuario
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <FilterPanel
        filters={filterConfig}
        values={filters}
        onChange={setFilters}
        onClear={() => setFilters({ search: '', role: 'all', status: 'all' })}
        onSearch={(search) => setFilters({ ...filters, search })}
        searchPlaceholder="Buscar por nombre o email"
      />

      {/* Bulk actions */}
      {selectedIds.length > 0 && isAdmin() && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedIds.length} usuario(s) seleccionado(s)
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('deactivate')}>
                <UserX size={14} className="mr-1" /> Desactivar
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleBulkAction('reactivate')}>
                <UserCheck size={14} className="mr-1" /> Activar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Administradores</p>
          <p className="text-2xl font-bold text-red-600">
            {users.filter(u => u.role === 'admin').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Profesores</p>
          <p className="text-2xl font-bold text-blue-600">
            {users.filter(u => u.role === 'teacher').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Estudiantes</p>
          <p className="text-2xl font-bold text-green-600">
            {users.filter(u => u.role === 'student').length}
          </p>
        </Card>
      </div>

      {/* User list */}
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        selectable={isAdmin()}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(user) => navigate(`/users/${user.id}`)}
        emptyMessage="No se encontraron usuarios"
      />

      {/* Action confirmation */}
      <AlertDialog 
        open={actionDialog.open} 
        onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.action === 'deactivate' ? 'Desactivar usuario' : 'Activar usuario'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres {actionDialog.action === 'deactivate' ? 'desactivar' : 'activar'} a {actionDialog.user?.first_name} {actionDialog.user?.last_name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleStatusChange(
                actionDialog.user, 
                actionDialog.action === 'deactivate' ? 'inactive' : 'active'
              )}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserList;
