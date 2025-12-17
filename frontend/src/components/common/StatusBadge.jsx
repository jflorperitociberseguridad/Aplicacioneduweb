import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfig = {
  // Course status
  draft: { label: 'Borrador', variant: 'secondary', className: 'bg-gray-100 text-gray-700' },
  published: { label: 'Publicado', variant: 'default', className: 'bg-green-100 text-green-700' },
  suspended: { label: 'Suspendido', variant: 'destructive', className: 'bg-orange-100 text-orange-700' },
  archived: { label: 'Archivado', variant: 'outline', className: 'bg-slate-100 text-slate-700' },
  
  // User status
  active: { label: 'Activo', variant: 'default', className: 'bg-green-100 text-green-700' },
  inactive: { label: 'Inactivo', variant: 'secondary', className: 'bg-gray-100 text-gray-700' },
  
  // Visibility
  visible: { label: 'Visible', variant: 'default', className: 'bg-blue-100 text-blue-700' },
  hidden: { label: 'Oculto', variant: 'secondary', className: 'bg-gray-100 text-gray-600' },
  
  // Enrollment status
  ended: { label: 'Finalizado', variant: 'outline', className: 'bg-slate-100 text-slate-700' },
  
  // Roles
  admin: { label: 'Administrador', className: 'bg-red-100 text-red-700' },
  teacher: { label: 'Profesor', className: 'bg-blue-100 text-blue-700' },
  editor: { label: 'Editor', className: 'bg-purple-100 text-purple-700' },
  student: { label: 'Estudiante', className: 'bg-green-100 text-green-700' },
};

const StatusBadge = ({ status, className, showLabel = true }) => {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  
  return (
    <Badge 
      variant="outline"
      className={cn(
        "font-medium border-0",
        config.className,
        className
      )}
    >
      {showLabel ? config.label : status}
    </Badge>
  );
};

export default StatusBadge;
