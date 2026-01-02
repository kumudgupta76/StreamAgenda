"use client";

import { useState, FormEvent, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export function Agenda() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAddTask = (e: FormEvent) => {
    e.preventDefault();
    if (newTaskText.trim()) {
      const newTask: Task = {
        id: crypto.randomUUID(),
        text: newTaskText.trim(),
        completed: false,
      };
      setTasks([...tasks, newTask]);
      setNewTaskText('');
    }
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const handleToggleTask = (id: string) => {
    setTasks(tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task));
  };

  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
  };

  const handleSaveEdit = (id: string) => {
    if (editingTaskText.trim()) {
        setTasks(tasks.map(task => task.id === id ? { ...task, text: editingTaskText.trim() } : task));
    }
    setEditingTaskId(null);
    setEditingTaskText('');
  };
  
  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingTaskText('');
  }

  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;

  return (
    <Card className={`w-full max-w-3xl shadow-2xl bg-card transition-all duration-500 ${isClient ? 'opacity-100' : 'opacity-0'}`}>
      <CardHeader>
        <CardTitle className="text-4xl font-black text-center text-primary tracking-wider font-headline">AGENDA</CardTitle>
      </CardHeader>
      <CardContent className="px-6 py-8">
        <form onSubmit={handleAddTask} className="flex gap-2 mb-8">
          <Input
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="Add a new agenda item..."
            className="text-base h-11"
          />
          <Button type="submit" size="lg" aria-label="Add task">
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
           {tasks.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>Your agenda is empty.</p>
              <p>Add some items to get started!</p>
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
