import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoriesApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import { toast } from 'sonner';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import ContextMenu from '@/components/common/ContextMenu';
import { Plus, FolderTree, Edit, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const CategoryList = () => {
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState([]);
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', parent_id: '' });
  const [expandedIds, setExpandedIds] = useState(new Set());

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const [allCategories, treeData] = await Promise.all([
        categoriesApi.list({}),
        categoriesApi.tree()
      ]);
      setCategories(allCategories);
      setTree(treeData);
      // Expand all by default
      const ids = new Set(allCategories.map(c => c.id));
      setExpandedIds(ids);
    } catch (error) {
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        parent_id: category.parent_id || ''
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '', parent_id: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    try {
      const data = {
        ...formData,
        parent_id: formData.parent_id || null
      };

      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, data);
        toast.success('Categoría actualizada');
      } else {
        await categoriesApi.create(data);
        toast.success('Categoría creada');
      }
      setDialogOpen(false);
      loadCategories();
    } catch (error) {
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`¿Eliminar la categoría "${category.name}"?`)) return;
    
    try {
      await categoriesApi.delete(category.id);
      toast.success('Categoría eliminada');
      loadCategories();
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al eliminar';
      toast.error(message);
    }
  };

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const renderCategory = (category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category.id);

    return (
      <div key={category.id}>
        <div 
          className={cn(
            "flex items-center justify-between p-3 hover:bg-gray-50 border-b",
            level > 0 && "bg-gray-50/50"
          )}
          style={{ paddingLeft: `${16 + level * 24}px` }}
        >
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button onClick={() => toggleExpand(category.id)} className="p-1">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : (
              <span className="w-6" />
            )}
            <FolderTree size={18} className="text-gray-400" />
            <div>
              <span className="font-medium">{category.name}</span>
              {category.description && (
                <p className="text-sm text-gray-500">{category.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {category.course_count || 0} cursos
            </span>
            <ContextMenu items={[
              { icon: Edit, label: 'Editar', onClick: () => handleOpenDialog(category) },
              { icon: Plus, label: 'Añadir subcategoría', onClick: () => {
                setFormData({ name: '', description: '', parent_id: category.id });
                setEditingCategory(null);
                setDialogOpen(true);
              }},
              { separator: true },
              { icon: Trash2, label: 'Eliminar', destructive: true, onClick: () => handleDelete(category) },
            ]} />
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {category.children.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs items={[{ label: 'Categorías' }]} />
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categorías de cursos</h1>
            <p className="text-gray-500 mt-1">Organiza los cursos en categorías jerárquicas</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus size={16} />
            Nueva categoría
          </Button>
        </div>
      </div>

      {/* Category tree */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : tree.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FolderTree className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No hay categorías</p>
              <Button variant="link" onClick={() => handleOpenDialog()}>Crear la primera</Button>
            </div>
          ) : (
            <div className="divide-y">
              {tree.map(category => renderCategory(category))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar categoría' : 'Nueva categoría'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Tecnología"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción opcional"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Categoría padre</Label>
              <Select
                value={formData.parent_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, parent_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sin categoría padre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría padre (raíz)</SelectItem>
                  {categories
                    .filter(c => c.id !== editingCategory?.id)
                    .map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryList;
