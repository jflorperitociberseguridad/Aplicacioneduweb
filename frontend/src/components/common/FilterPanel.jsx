import React, { useState } from 'react';
import { Filter, X, ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const FilterPanel = ({
  filters,
  values,
  onChange,
  onClear,
  onSearch,
  searchPlaceholder = 'Buscar...',
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(values.search || '');

  const hasActiveFilters = Object.entries(values).some(
    ([key, value]) => key !== 'search' && value && value !== 'all'
  );

  const handleSearch = (e) => {
    e?.preventDefault();
    onSearch?.(searchValue);
  };

  const handleFilterChange = (key, value) => {
    onChange({ ...values, [key]: value });
  };

  const handleClear = () => {
    setSearchValue('');
    onClear?.();
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-10"
          />
        </div>
        <Button type="submit">Buscar</Button>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter size={16} />
              Filtros
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-blue-600 rounded-full" />
              )}
              <ChevronDown 
                size={16} 
                className={cn("transition-transform", isOpen && "rotate-180")} 
              />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </form>

      {/* Filter panel */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filters.map((filter) => (
                <div key={filter.key} className="space-y-2">
                  <Label className="text-sm text-gray-600">{filter.label}</Label>
                  <Select
                    value={values[filter.key] || 'all'}
                    onValueChange={(value) => handleFilterChange(filter.key, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Todos`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {filter.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            
            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleClear} className="gap-2">
                  <X size={14} />
                  Limpiar filtros
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default FilterPanel;
