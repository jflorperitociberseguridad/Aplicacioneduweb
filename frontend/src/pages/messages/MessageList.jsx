import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { toast } from 'sonner';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import { cn } from '@/lib/utils';
import { MessageSquare, Send, Plus, Search, Mail, MailOpen, Clock, User } from 'lucide-react';

const MessageList = () => {
  const { user } = useAuth();
  
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessageDialog, setNewMessageDialog] = useState(false);
  const [users, setUsers] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [newMessage, setNewMessage] = useState({ recipient_id: '', subject: '', content: '' });

  useEffect(() => {
    loadThreads();
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedThread) {
      loadMessages(selectedThread.id);
    }
  }, [selectedThread]);

  const loadThreads = async () => {
    setLoading(true);
    try {
      const response = await api.get('/messages/threads');
      setThreads(response || []);
    } catch (error) {
      // If endpoint doesn't exist yet, use empty array
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (threadId) => {
    try {
      const response = await api.get(`/messages/threads/${threadId}/messages`);
      setMessages(response || []);
    } catch (error) {
      setMessages([]);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response || []);
    } catch (error) {
      setUsers([]);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.recipient_id || !newMessage.subject || !newMessage.content) {
      toast.error('Completa todos los campos');
      return;
    }

    try {
      await api.post('/messages/threads', newMessage);
      toast.success('Mensaje enviado');
      setNewMessageDialog(false);
      setNewMessage({ recipient_id: '', subject: '', content: '' });
      loadThreads();
    } catch (error) {
      toast.error('Error al enviar mensaje');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedThread) return;

    try {
      await api.post(`/messages/threads/${selectedThread.id}/messages`, {
        content: replyText
      });
      toast.success('Respuesta enviada');
      setReplyText('');
      loadMessages(selectedThread.id);
    } catch (error) {
      toast.error('Error al enviar respuesta');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) { // Less than 24h
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  // Demo threads if none exist
  const displayThreads = threads.length > 0 ? threads : [
    {
      id: 'demo-1',
      subject: '¡Bienvenidos al curso!',
      type: 'announcement',
      created_by: 'user-teacher',
      sender_name: 'María García López',
      last_message_at: new Date().toISOString(),
      preview: 'Bienvenidos al curso de Ciberseguridad con IA...',
      unread: true
    },
    {
      id: 'demo-2',
      subject: 'Duda sobre el Tema 1',
      type: 'message',
      created_by: 'user-student1',
      sender_name: 'Ana Fernández Torres',
      last_message_at: new Date(Date.now() - 86400000).toISOString(),
      preview: 'Hola, tengo una pregunta sobre los conceptos básicos...',
      unread: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Breadcrumbs items={[{ label: 'Mensajes' }]} />
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mensajes</h1>
            <p className="text-gray-500 mt-1">Comunicación interna de la plataforma</p>
          </div>
          <Button onClick={() => setNewMessageDialog(true)}>
            <Plus size={16} className="mr-2" />
            Nuevo mensaje
          </Button>
        </div>
      </div>

      {/* Messages layout */}
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-240px)]">
        {/* Thread list */}
        <Card className="col-span-4 flex flex-col">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar conversaciones..." className="pl-10" />
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {displayThreads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className={cn(
                    "p-4 cursor-pointer hover:bg-gray-50 transition-colors",
                    selectedThread?.id === thread.id && "bg-blue-50",
                    thread.unread && "bg-blue-50/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {getInitials(thread.sender_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={cn(
                          "text-sm truncate",
                          thread.unread ? "font-semibold text-gray-900" : "text-gray-700"
                        )}>
                          {thread.sender_name}
                        </p>
                        <span className="text-xs text-gray-400">
                          {formatDate(thread.last_message_at)}
                        </span>
                      </div>
                      <p className={cn(
                        "text-sm truncate",
                        thread.unread ? "font-medium text-gray-900" : "text-gray-600"
                      )}>
                        {thread.subject}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-1">
                        {thread.preview}
                      </p>
                    </div>
                    {thread.unread && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Message content */}
        <Card className="col-span-8 flex flex-col">
          {selectedThread ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedThread.subject}</CardTitle>
                    <p className="text-sm text-gray-500">
                      {selectedThread.type === 'announcement' ? 'Anuncio' : 'Conversación'} con {selectedThread.sender_name}
                    </p>
                  </div>
                  {selectedThread.type === 'announcement' && (
                    <Badge variant="secondary">Anuncio</Badge>
                  )}
                </div>
              </CardHeader>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {/* Demo message */}
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                        {getInitials(selectedThread.sender_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{selectedThread.sender_name}</span>
                        <span className="text-xs text-gray-400">
                          {formatDate(selectedThread.last_message_at)}
                        </span>
                      </div>
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                        {selectedThread.id === 'demo-1' ? (
                          <div>
                            <p>¡Hola a todos!</p>
                            <p className="mt-2">Bienvenidos al curso de Ciberseguridad con Inteligencia Artificial.</p>
                            <p className="mt-2">Estoy muy emocionada de comenzar este viaje con vosotros. Durante las próximas semanas, exploraremos cómo la IA está revolucionando el campo de la ciberseguridad.</p>
                            <p className="mt-2">¡Mucho éxito!</p>
                            <p className="mt-2">María García</p>
                          </div>
                        ) : (
                          <p>Hola, tengo una pregunta sobre los conceptos básicos de ciberseguridad. ¿Podría explicarme más sobre los pilares CIA?</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gray-100 text-gray-700 text-sm">
                          {getInitials(msg.sender_name || 'Usuario')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{msg.sender_name || 'Usuario'}</span>
                          <span className="text-xs text-gray-400">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escribe tu respuesta..."
                    className="min-h-[80px]"
                  />
                  <Button onClick={handleReply} className="self-end">
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Selecciona una conversación</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* New message dialog */}
      <Dialog open={newMessageDialog} onOpenChange={setNewMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo mensaje</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Destinatario</label>
              <Select
                value={newMessage.recipient_id}
                onValueChange={(value) => setNewMessage({ ...newMessage, recipient_id: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.id !== user?.id).map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Asunto</label>
              <Input
                value={newMessage.subject}
                onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                placeholder="Asunto del mensaje"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Mensaje</label>
              <Textarea
                value={newMessage.content}
                onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                placeholder="Escribe tu mensaje..."
                className="mt-1 min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMessageDialog(false)}>Cancelar</Button>
            <Button onClick={handleSendMessage}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessageList;
