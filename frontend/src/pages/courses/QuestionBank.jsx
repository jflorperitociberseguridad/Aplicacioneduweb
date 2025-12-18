import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import ContextMenu from '@/components/common/ContextMenu';
import { ArrowLeft, Plus, Edit, Trash2, HelpCircle, CheckCircle, ToggleLeft, FileText, FolderPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Opción múltiple', icon: CheckCircle },
  { value: 'true_false', label: 'Verdadero/Falso', icon: ToggleLeft },
  { value: 'short_answer', label: 'Respuesta corta', icon: FileText },
  { value: 'essay', label: 'Ensayo', icon: FileText },
];

const QuestionBank = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  
  const [questionDialog, setQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    category_id: '',
    question_type: 'multiple_choice',
    question_text: '',
    points: 10,
    options: [{ id: 'a', text: '', correct: false }, { id: 'b', text: '', correct: false }],
    correct_answer: '',
    feedback: ''
  });

  useEffect(() => {
    loadData();
  }, [courseId]);

  useEffect(() => {
    if (selectedCategory) {
      loadQuestions(selectedCategory);
    }
  }, [selectedCategory]);

  const loadData = async () => {
    setLoading(true);
    try {
      const cats = await api.get(`/courses/${courseId}/question-categories`);
      setCategories(cats);
      if (cats.length > 0) {
        setSelectedCategory(cats[0].id);
      }
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (categoryId) => {
    try {
      const qs = await api.get(`/courses/${courseId}/questions`, { params: { category_id: categoryId } });
      setQuestions(qs);
    } catch (error) {
      setQuestions([]);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) return;
    try {
      await api.post(`/courses/${courseId}/question-categories`, null, {
        params: { name: categoryName }
      });
      toast.success('Categoría creada');
      setCategoryDialog(false);
      setCategoryName('');
      loadData();
    } catch (error) {
      toast.error('Error al crear categoría');
    }
  };

  const openQuestionDialog = (question = null) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({
        category_id: question.category_id,
        question_type: question.type,
        question_text: question.question_text,
        points: question.points,
        options: question.options || [{ id: 'a', text: '', correct: false }],
        correct_answer: question.correct_answer || '',
        feedback: question.feedback || ''
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        category_id: selectedCategory || '',
        question_type: 'multiple_choice',
        question_text: '',
        points: 10,
        options: [{ id: 'a', text: '', correct: false }, { id: 'b', text: '', correct: false }],
        correct_answer: '',
        feedback: ''
      });
    }
    setQuestionDialog(true);
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.question_text.trim()) {
      toast.error('El texto de la pregunta es obligatorio');
      return;
    }

    try {
      const params = {
        category_id: questionForm.category_id || selectedCategory,
        question_type: questionForm.question_type,
        question_text: questionForm.question_text,
        points: questionForm.points,
        feedback: questionForm.feedback || undefined
      };

      if (questionForm.question_type === 'multiple_choice') {
        params.options = JSON.stringify(questionForm.options);
      } else if (questionForm.question_type === 'true_false') {
        params.correct_answer = questionForm.correct_answer;
      }

      if (editingQuestion) {
        await api.patch(`/questions/${editingQuestion.id}`, null, { params });
        toast.success('Pregunta actualizada');
      } else {
        await api.post(`/courses/${courseId}/questions`, null, { params });
        toast.success('Pregunta creada');
      }

      setQuestionDialog(false);
      loadQuestions(selectedCategory);
    } catch (error) {
      toast.error('Error al guardar pregunta');
    }
  };

  const handleDeleteQuestion = async (question) => {
    if (!window.confirm('¿Eliminar esta pregunta?')) return;
    try {
      await api.delete(`/questions/${question.id}`);
      toast.success('Pregunta eliminada');
      loadQuestions(selectedCategory);
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const addOption = () => {
    const nextId = String.fromCharCode(97 + questionForm.options.length);
    setQuestionForm({
      ...questionForm,
      options: [...questionForm.options, { id: nextId, text: '', correct: false }]
    });
  };

  const updateOption = (index, field, value) => {
    const newOptions = [...questionForm.options];
    newOptions[index][field] = value;
    if (field === 'correct' && value) {
      newOptions.forEach((o, i) => { if (i !== index) o.correct = false; });
    }
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const getTypeIcon = (type) => {
    const found = QUESTION_TYPES.find(t => t.value === type);
    return found?.icon || HelpCircle;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs items={[
          { label: 'Cursos', href: '/courses' },
          { label: courseId, href: `/courses/${courseId}` },
          { label: 'Banco de preguntas' }
        ]} />
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Banco de preguntas</h1>
            <p className="text-gray-500 mt-1">Gestiona las preguntas para cuestionarios</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
              <ArrowLeft size={16} className="mr-2" />
              Volver al curso
            </Button>
            <Button variant="outline" onClick={() => setCategoryDialog(true)}>
              <FolderPlus size={16} className="mr-2" />
              Nueva categoría
            </Button>
            <Button onClick={() => openQuestionDialog()}>
              <Plus size={16} className="mr-2" />
              Nueva pregunta
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Categories sidebar */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Categorías</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {categories.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No hay categorías</p>
            ) : (
              <div className="divide-y">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "w-full text-left p-3 hover:bg-gray-50 transition-colors",
                      selectedCategory === cat.id && "bg-blue-50 border-l-2 border-blue-500"
                    )}
                  >
                    <p className="font-medium text-sm">{cat.name}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions list */}
        <div className="col-span-9">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Preguntas ({questions.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {questions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <HelpCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay preguntas en esta categoría</p>
                  <Button variant="link" onClick={() => openQuestionDialog()}>Crear la primera</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map(question => {
                    const TypeIcon = getTypeIcon(question.type);
                    return (
                      <div key={question.id} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <TypeIcon size={16} className="text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium">{question.question_text}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">
                                  {QUESTION_TYPES.find(t => t.value === question.type)?.label}
                                </Badge>
                                <Badge variant="secondary">{question.points} pts</Badge>
                              </div>
                            </div>
                          </div>
                          <ContextMenu items={[
                            { icon: Edit, label: 'Editar', onClick: () => openQuestionDialog(question) },
                            { separator: true },
                            { icon: Trash2, label: 'Eliminar', destructive: true, onClick: () => handleDeleteQuestion(question) },
                          ]} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Category dialog */}
      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Nombre de la categoría</Label>
            <Input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Ej: Fundamentos"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateCategory}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question dialog */}
      <Dialog open={questionDialog} onOpenChange={setQuestionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? 'Editar pregunta' : 'Nueva pregunta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de pregunta</Label>
                <Select
                  value={questionForm.question_type}
                  onValueChange={(v) => setQuestionForm({ ...questionForm, question_type: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Puntos</Label>
                <Input
                  type="number"
                  value={questionForm.points}
                  onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 10 })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Texto de la pregunta *</Label>
              <Textarea
                value={questionForm.question_text}
                onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                className="mt-1"
                rows={3}
                placeholder="Escribe la pregunta aquí..."
              />
            </div>

            {questionForm.question_type === 'multiple_choice' && (
              <div>
                <Label>Opciones (marca la correcta)</Label>
                <div className="space-y-2 mt-2">
                  {questionForm.options.map((option, index) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={option.correct}
                        onCheckedChange={(checked) => updateOption(index, 'correct', checked)}
                      />
                      <span className="font-medium w-6">{option.id.toUpperCase()})</span>
                      <Input
                        value={option.text}
                        onChange={(e) => updateOption(index, 'text', e.target.value)}
                        placeholder={`Opción ${option.id.toUpperCase()}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={addOption}>
                    <Plus size={14} className="mr-1" /> Añadir opción
                  </Button>
                </div>
              </div>
            )}

            {questionForm.question_type === 'true_false' && (
              <div>
                <Label>Respuesta correcta</Label>
                <Select
                  value={questionForm.correct_answer}
                  onValueChange={(v) => setQuestionForm({ ...questionForm, correct_answer: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Verdadero</SelectItem>
                    <SelectItem value="false">Falso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Retroalimentación (opcional)</Label>
              <Textarea
                value={questionForm.feedback}
                onChange={(e) => setQuestionForm({ ...questionForm, feedback: e.target.value })}
                className="mt-1"
                rows={2}
                placeholder="Explicación que verá el estudiante..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveQuestion}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionBank;
