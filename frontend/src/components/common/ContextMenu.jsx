import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';

const ContextMenu = ({ items, triggerClassName }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={triggerClassName || "h-8 w-8 p-0"}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {items.map((item, index) => {
          if (item.separator) {
            return <DropdownMenuSeparator key={index} />;
          }
          
          if (item.hidden) return null;
          
          return (
            <DropdownMenuItem
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                item.onClick?.();
              }}
              disabled={item.disabled}
              className={item.destructive ? 'text-red-600 focus:text-red-600' : ''}
            >
              {item.icon && <item.icon className="mr-2 h-4 w-4" />}
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ContextMenu;
