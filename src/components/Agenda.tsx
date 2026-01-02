'use client';

import { useState, FormEvent, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit, Save, MoreVertical, Trash, GripVertical, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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

const LOCAL_STORAGE_KEY = 'streamAgendaData_v3';

const getDefaultAgendas = (): AgendaGroup[] => {
    return [
      {
        id: crypto.randomUUID(),
        name: 'My First Agenda',
        tasks: [],
      },
    ];
};

function AgendaList({
    agendaGroups,
    activeAgendaId,
    setActiveAgendaId,
    handleCreateAgenda,
    newAgendaName,
    setNewAgendaName,
    handleDeleteAgenda,
    handleRenameAgenda,
    editingAgendaId,
    setEditingAgendaId,
    editingAgendaName,
    setEditingAgendaName,
}: {
    agendaGroups: AgendaGroup[];
    activeAgendaId: string | null;
    setActiveAgendaId: (id: string) => void;
    handleCreateAgenda: () => void;
    newAgendaName: string;
    setNewAgendaName: (name: string) => void;
    handleDeleteAgenda: (id: string) => void;
    handleRenameAgenda: (id: string) => void;
    editingAgendaId: string | null;
    setEditingAgendaId: (id: string | null) => void;
    editingAgendaName: string;
    setEditingAgendaName: (name: string) => void;
}) {
    return (
        <aside className="w-64 flex flex-col border-r h-full bg-card">
            <div className="p-2 border-b">
                <h2 className="text-lg font-semibold tracking-tight p-2">Tasks</h2>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="sm" className="w-full">
                            <Plus className="mr-2" /> New Agenda
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Create New Agenda</AlertDialogTitle>
                            <AlertDialogDescription>Enter a name for your new agenda.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <Input
                            placeholder="e.g. Weekly Meeting"
                            value={newAgendaName}
                            onChange={(e) => setNewAgendaName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCreateAgenda();
                                    const cancelButton = (e.target as HTMLElement).closest('[role="dialog"]')
                                        ?.querySelector('[aria-label="Cancel"]');
                                    if (cancelButton instanceof HTMLElement) {
                                        cancelButton.click();
                                    }
                                }
                            }}
                        />
                        <AlertDialogFooter>
                            <AlertDialogCancel aria-label="Cancel">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCreateAgenda}>Create</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {agendaGroups.map(agenda => (
                        <div key={agenda.id} className="relative group/item">
                            {editingAgendaId === agenda.id ? (
                                <div className="flex items-center gap-1 p-2">
                                    <Input
                                        value={editingAgendaName}
                                        onChange={e => setEditingAgendaName(e.target.value)}
                                        autoFocus
                                        className="h-8"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleRenameAgenda(agenda.id);
                                            if (e.key === 'Escape') setEditingAgendaId(null);
                                        }}
                                        onBlur={() => handleRenameAgenda(agenda.id)}
                                    />
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onMouseDown={() => handleRenameAgenda(agenda.id)}><Save className="h-4 w-4" /></Button>
                                </div>
                            ) : (
                               <Button variant={activeAgendaId === agenda.id ? "secondary" : "ghost"} onClick={() => setActiveAgendaId(agenda.id)} className="w-full justify-start h-10 gap-2">
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    <span className="truncate flex-1 text-left">{agenda.name}</span>
                                     <DropdownMenuForAgenda
                                        onRename={() => {
                                            setEditingAgendaId(agenda.id);
                                            setEditingAgendaName(agenda.name);
                                        }}
                                        onDelete={() => handleDeleteAgenda(agenda.id)}
                                        disabled={agendaGroups.length <= 1}
                                    />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </aside>
    )
}

function DropdownMenuForAgenda({ onRename, onDelete, disabled }: { onRename: () => void; onDelete: () => void; disabled: boolean }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onSelect={onRename}>
                    <Edit className="mr-2 h-4 w-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onDelete} disabled={disabled} className="text-destructive">
                    <Trash className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}


export function Agenda() {
    const [agendaGroups, setAgendaGroups] = useState<AgendaGroup[]>([]);
    const [activeAgendaId, setActiveAgendaId] = useState<string | null>(null);
    const [newTaskText, setNewTaskText] = useState('');
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editingTaskText, setEditingTaskText] = useState('');
    const [newAgendaName, setNewAgendaName] = useState('');
    const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
    const [editingAgendaName, setEditingAgendaName] = useState('');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Load from localStorage on initial render
    useEffect(() => {
        if (!isClient) return;
        try {
            const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                if (Array.isArray(parsedData) && parsedData.length > 0) {
                    setAgendaGroups(parsedData);
                     const activeId = localStorage.getItem('activeAgendaId');
                    setActiveAgendaId(activeId && parsedData.some(g => g.id === activeId) ? activeId : parsedData[0].id);
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
    }, [isClient]);

    // Save to localStorage whenever agendaGroups or activeAgendaId changes
    useEffect(() => {
        if (isClient && agendaGroups.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(agendaGroups));
            if(activeAgendaId) {
                localStorage.setItem('activeAgendaId', activeAgendaId);
            }
        }
    }, [agendaGroups, activeAgendaId, isClient]);


    const activeAgenda = useMemo(() => agendaGroups.find(agenda => agenda.id === activeAgendaId), [agendaGroups, activeAgendaId]);

    const updateTasksForActiveAgenda = (newTasks: Task[]) => {
        if (!activeAgendaId) return;
        setAgendaGroups(prev => prev.map(agenda =>
            agenda.id === activeAgendaId ? { ...agenda, tasks: newTasks } : agenda
        ));
    };

    const handleAddTask = (e: FormEvent) => {
        e.preventDefault();
        if (newTaskText.trim() && activeAgenda) {
            const newTask: Task = {
                id: crypto.randomUUID(),
                text: newTaskText.trim(),
                completed: false,
            };
            updateTasksForActiveAgenda([...(activeAgenda.tasks || []), newTask]);
            setNewTaskText('');
        }
    };

    const handleDeleteTask = (id: string) => {
        if (!activeAgenda) return;
        updateTasksForActiveAgenda(activeAgenda.tasks.filter(task => task.id !== id));
    };

    const handleToggleTask = (id: string) => {
        if (!activeAgenda) return;
        updateTasksForActiveAgenda(activeAgenda.tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task));
    };

    const handleStartEdit = (task: Task) => {
        setEditingTaskId(task.id);
        setEditingTaskText(task.text);
    };

    const handleSaveEdit = (id: string) => {
        if (editingTaskText.trim() && activeAgenda) {
            updateTasksForActiveAgenda(activeAgenda.tasks.map(task => task.id === id ? { ...task, text: editingTaskText.trim() } : task));
        }
        setEditingTaskId(null);
        setEditingTaskText('');
    };

     const handleCancelEdit = () => {
        setEditingTaskId(null);
        setEditingTaskText('');
    }

    const handleCreateAgenda = () => {
        if (newAgendaName.trim()) {
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
        setAgendaGroups(prev => {
            const newAgendas = prev.filter(agenda => agenda.id !== agendaId);
            if (activeAgendaId === agendaId) {
                const newActiveId = newAgendas.length > 0 ? newAgendas[0].id : null;
                setActiveAgendaId(newActiveId);
            }
            return newAgendas;
        });
    };

    const handleRenameAgenda = (agendaId: string) => {
        if(editingAgendaName.trim()){
            setAgendaGroups(prev => prev.map(agenda =>
                agenda.id === agendaId ? { ...agenda, name: editingAgendaName.trim() } : agenda
            ));
        }
        setEditingAgendaId(null);
        setEditingAgendaName('');
    }


    const completedTasks = activeAgenda?.tasks.filter(task => task.completed).length || 0;
    const totalTasks = activeAgenda?.tasks.length || 0;

    if (!isClient) {
        // Render a placeholder or loading state on the server
        return <div className="flex-1 flex" />;
    }

    return (
        <div className="flex flex-1 overflow-hidden">
            <AgendaList
                agendaGroups={agendaGroups}
                activeAgendaId={activeAgendaId}
                setActiveAgendaId={setActiveAgendaId}
                handleCreateAgenda={handleCreateAgenda}
                newAgendaName={newAgendaName}
                setNewAgendaName={setNewAgendaName}
                handleDeleteAgenda={handleDeleteAgenda}
                handleRenameAgenda={handleRenameAgenda}
                editingAgendaId={editingAgendaId}
                setEditingAgendaId={setEditingAgendaId}
                editingAgendaName={editingAgendaName}
                setEditingAgendaName={setEditingAgendaName}
            />
            <main className="flex-1 flex flex-col h-full">
                <Card className="flex-1 flex flex-col shadow-none border-none bg-transparent rounded-none">
                    <CardHeader className="border-b">
                        <CardTitle className="text-2xl font-bold">Agenda:{activeAgenda?.name || 'Select an Agenda'}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-4 p-4 md:p-6 overflow-hidden">
                        <form onSubmit={handleAddTask} className="flex gap-2">
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
                        <ScrollArea className="flex-1 -mr-4 pr-4">
                            <ul className="space-y-3 pr-2">
                                {activeAgenda?.tasks.map((task, index) => (
                                    <li
                                        key={task.id}
                                        className="flex items-center gap-4 p-3 rounded-lg border bg-card/80 backdrop-blur-sm transition-shadow hover:shadow-md"
                                    >
                                        <Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => handleToggleTask(task.id)} className="h-6 w-6 rounded-md" />
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
                                            <Label htmlFor={`task-${task.id}`} className={cn('flex-1 text-lg transition-colors cursor-text', task.completed ? 'line-through text-muted-foreground' : 'text-foreground')} onDoubleClick={() => handleStartEdit(task)}>
                                                {task.text}
                                            </Label>
                                        )}
                                        <div className="flex gap-1 ml-auto">
                                            {editingTaskId === task.id ? (
                                                <Button variant="ghost" size="icon" onMouseDown={(e) => { e.preventDefault(); handleSaveEdit(task.id) }} aria-label="Save task">
                                                    <Save className="h-5 w-5 text-muted-foreground" />
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
                                {totalTasks === 0 && activeAgenda && (
                                    <div className="text-center text-muted-foreground py-8 h-full flex flex-col justify-center items-center">
                                        <Circle className="h-12 w-12 mb-4" />
                                        <p className="text-lg">Your agenda is empty.</p>
                                        <p>Add some items to get started!</p>
                                    </div>
                                )}
                                {!activeAgenda && isClient && (
                                    <div className="text-center text-muted-foreground py-8 h-full flex flex-col justify-center items-center">
                                        <p className="text-lg font-semibold">No agenda selected.</p>
                                        <p>Create or select an agenda to begin.</p>
                                    </div>
                                )}
                            </ul>
                        </ScrollArea>
                    </CardContent>
                     {activeAgenda && totalTasks > 0 && (
                        <CardFooter className="justify-end gap-3 border-t pt-4">
                            {totalTasks > 0 && completedTasks === totalTasks ? (
                                <p className="text-lg font-semibold text-green-600 dark:text-green-500 flex items-center gap-2">
                                    <CheckCircle2 /> Everything Covered! 🎉
                                </p>
                            ) : (
                                <p className="text-lg font-semibold text-primary">
                                    <span className="font-black">{completedTasks}/{totalTasks}</span> items covered
                                </p>
                            )}
                        </CardFooter>
                    )}
                </Card>
            </main>
        </div>
    );
}
