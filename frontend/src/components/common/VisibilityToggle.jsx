import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const VisibilityToggle = ({ visible, onToggle, disabled = false, size = 'sm' }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={size}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(!visible);
            }}
            disabled={disabled}
            className={cn(
              "h-8 w-8 p-0",
              visible ? "text-blue-600" : "text-gray-400"
            )}
          >
            {visible ? <Eye size={16} /> : <EyeOff size={16} />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {visible ? 'Visible para estudiantes' : 'Oculto para estudiantes'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VisibilityToggle;
