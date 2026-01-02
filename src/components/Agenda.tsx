"use client";

import { useState, FormEvent, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, MoreVertical, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface AgendaGroup {
  id: string;
  name: string;
  tasks: Task[];
}

const LOCAL_STORAGE_KEY = 'streamAgendaData';

const getDefaultAgendas = (): AgendaGroup[] => {
  return [
    {
      id: crypto.randomUUID(),
      name: 'My First Agenda',
      tasks: [],
    },
  ];
};

export function Agenda() {
  const [agendaGroups, setAgendaGroups] = useState<AgendaGroup[]>([]);
  const [activeAgendaId, setActiveAgendaId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [newAgendaName, setNewAgendaName] = useState('');
  
  const [isClient, setIsClient] = useState(false);

  // Load from localStorage on initial render
  useEffect(() => {
    setIsClient(true);
    try {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
        const parsedData: AgendaGroup[] = JSON.parse(savedData);
        if (parsedData.length > 0) {
          setAgendaGroups(parsedData);
          setActiveAgendaId(parsedData[0].id);
        } else {
            const defaultAgendas = getDefaultAgendas();
            setAgendaGroups(defaultAgendas);
            setActiveAgendaId(defaultAgendas[0].id);
        }
      } else {
        const defaultAgendas = getDefaultAgendas();
        setAgendaGroups(defaultAgendas);
        setActiveAgendaId(defaultAgendas[0].id);
      }
    } catch (error) {
      console.error("Failed to load from localStorage", error);
      const defaultAgendas = getDefaultAgendas();
      setAgendaGroups(defaultAgendas);
      setActiveAgendaId(defaultAgendas[0].id);
    }
  }, []);

  // Save to localStorage whenever agendaGroups changes
  useEffect(() => {
    if (isClient && agendaGroups.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(agendaGroups));
    }
  }, [agendaGroups, isClient]);

  const activeAgenda = agendaGroups.find(agenda => agenda.id === activeAgendaId);
  const tasks = activeAgenda ? activeAgenda.tasks : [];

  const updateTasksForActiveAgenda = (newTasks: Task[]) => {
    if (!activeAgendaId) return;
    const newAgendaGroups = agendaGroups.map(agenda =>
      agenda.id === activeAgendaId ? { ...agenda, tasks: newTasks } : agenda
    );
    setAgendaGroups(newAgendaGroups);
  };

  const handleAddTask = (e: FormEvent) => {
    e.preventDefault();
    if (newTaskText.trim() && activeAgenda) {
      const newTask: Task = {
        id: crypto.randomUUID(),
        text: newTaskText.trim(),
        completed: false,
      };
      updateTasksForActiveAgenda([...tasks, newTask]);
      setNewTaskText('');
    }
  };

  const handleDeleteTask = (id: string) => {
    updateTasksForActiveAgenda(tasks.filter(task => task.id !== id));
  };

  const handleToggleTask = (id: string) => {
    updateTasksForActiveAgenda(tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task));
  };

  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
  };

  const handleSaveEdit = (id: string) => {
    if (editingTaskText.trim()) {
        updateTasksForActiveAgenda(tasks.map(task => task.id === id ? { ...task, text: editingTaskText.trim() } : task));
    }
    setEditingTaskId(null);
    setEditingTaskText('');
  };
  
  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingTaskText('');
  }

  const handleCreateAgenda = () => {
    if(newAgendaName.trim()){
      const newAgenda: AgendaGroup = {
        id: crypto.randomUUID(),
        name: newAgendaName.trim(),
        tasks: [],
      };
      const updatedAgendas = [...agendaGroups, newAgenda];
      setAgendaGroups(updatedAgendas);
      setActiveAgendaId(newAgenda.id);
      setNewAgendaName('');
    }
  };

  const handleDeleteAgenda = (agendaId: string) => {
    const newAgendas = agendaGroups.filter(agenda => agenda.id !== agendaId);
    setAgendaGroups(newAgendas);
    if (activeAgendaId === agendaId) {
        setActiveAgendaId(newAgendas.length > 0 ? newAgendas[0].id : null);
    }
  };

  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;

  return (
    <Card className={`w-full max-w-3xl shadow-2xl bg-card transition-all duration-500 ${isClient ? 'opacity-100' : 'opacity-0'}`}>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="text-4xl font-black text-primary tracking-wider font-headline">AGENDA</CardTitle>
            <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> New Agenda
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Create New Agenda</AlertDialogTitle>
                  <AlertDialogDescription>
                    Enter a name for your new agenda.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                    placeholder="e.g. Weekly Meeting"
                    value={newAgendaName}
                    onChange={(e) => setNewAgendaName(e.target.value)}
                    onKeyDown={(e) => {
                      if(e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateAgenda();
                        (e.target as HTMLElement).closest('[role="dialog"]')
                          ?.querySelector('[aria-label="Close"]')
                          ?.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));
                      }
                    }}
                  />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCreateAgenda}>Create</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            </div>
        </div>
         <div className="flex items-center gap-2 pt-4">
            <Select onValueChange={setActiveAgendaId} value={activeAgendaId || ''}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an agenda" />
              </SelectTrigger>
              <SelectContent>
                {agendaGroups.map(agenda => (
                  <SelectItem key={agenda.id} value={agenda.id}>{agenda.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={!activeAgenda || agendaGroups.length <= 1}>
                    <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => activeAgendaId && handleDeleteAgenda(activeAgendaId)}
                    disabled={!activeAgenda || agendaGroups.length <= 1}
                >
                    <Trash className="mr-2 h-4 w-4"/> Delete Agenda
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="px-6 py-8">
        <form onSubmit={handleAddTask} className="flex gap-2 mb-8">
          <Input
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="Add a new agenda item..."
            className="text-base h-11"
            disabled={!activeAgenda}
          />
          <Button type="submit" size="lg" aria-label="Add task" disabled={!activeAgenda}>
            <Plus />
          </Button>
        </form>

        <ul className="space-y-3">
          {tasks.map((task, index) => (
            <li
              key={task.id}
              className={`flex items-center gap-4 p-3 rounded-lg border bg-secondary/30 transition-all duration-500 ease-out hover:shadow-md hover:bg-secondary/60 ${isClient ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: `${index * 70}ms` }}
            >
              <Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => handleToggleTask(task.id)} className="h-6 w-6 rounded-md"/>
              {editingTaskId === task.id ? (
                <Input
                  value={editingTaskText}
                  onChange={(e) => setEditingTaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(task.id); }
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  onBlur={() => handleSaveEdit(task.id)}
                  autoFocus
                  className="flex-1 h-9 text-lg"
                />
              ) : (
                <Label htmlFor={`task-${task.id}`} className={`flex-1 text-xl font-body transition-colors ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'} cursor-text`} onDoubleClick={() => handleStartEdit(task)}>
                  {task.text}
                </Label>
              )}
              <div className="flex gap-1 ml-auto">
                 {editingTaskId === task.id ? (
                  <Button variant="ghost" size="icon" onMouseDown={(e) => {e.preventDefault(); handleSaveEdit(task.id)}} aria-label="Save task">
                    <Save className="h-5 w-5 text-accent" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => handleStartEdit(task)} aria-label="Edit task">
                    <Edit className="h-5 w-5 text-muted-foreground hover:text-primary" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)} aria-label="Delete task">
                  <Trash2 className="h-5 w-5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </li>
          ))}
           {tasks.length === 0 && activeAgenda && (
            <div className="text-center text-muted-foreground py-8">
              <p>Your agenda is empty.</p>
              <p>Add some items to get started!</p>
            </div>
           )}
           {!activeAgenda && isClient && (
            <div className="text-center text-muted-foreground py-8">
                <p>No agenda selected.</p>
                <p>Create or select an agenda to begin.</p>
            </div>
           )}
        </ul>
      </CardContent>
      {totalTasks > 0 && (
        <CardFooter className="justify-end gap-3 mt-4 border-t pt-6">
          <p className="text-lg font-semibold text-primary">
            <span className="font-black">{completedTasks}/{totalTasks}</span> agenda covered
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
