import React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const CollapsibleSection = ({ 
  title, 
  children, 
  defaultOpen = true,
  icon: Icon,
  className,
  headerClassName,
  contentClassName,
  badge
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger className={cn(
        "flex items-center justify-between w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-t-lg border border-gray-200 transition-colors",
        !isOpen && "rounded-b-lg",
        headerClassName
      )}>
        <div className="flex items-center gap-3">
          {Icon && <Icon size={20} className="text-gray-500" />}
          <span className="font-medium text-gray-900">{title}</span>
          {badge}
        </div>
        <ChevronDown 
          size={20} 
          className={cn(
            "text-gray-500 transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </CollapsibleTrigger>
      <CollapsibleContent className={cn(
        "border border-t-0 border-gray-200 rounded-b-lg bg-white",
        contentClassName
      )}>
        <div className="p-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default CollapsibleSection;
