"use client"

import * as React from 'react';
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
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarTrigger
} from '@/components/ui/sidebar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils';

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

const LOCAL_STORAGE_KEY = 'streamAgendaData_v2';

const getDefaultAgendas = (): AgendaGroup[] => {
    return [
      {
        id: crypto.randomUUID(),
        name: 'My First Agenda',
        tasks: [],
      },
    ];
};

function AgendaSidebar({
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
        <Sidebar>
            <SidebarHeader>
                 <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-semibold">Agendas</CardTitle>
                    <SidebarTrigger />
                </div>
            </SidebarHeader>
             <SidebarContent className="p-2">
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
                                    (e.target as HTMLElement).closest('[role="dialog"]')
                                        ?.querySelector('[aria-label="Close"]')
                                        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                                }
                            }}
                        />
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCreateAgenda}>Create</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <SidebarMenu>
                    {agendaGroups.map(agenda => (
                        <SidebarMenuItem key={agenda.id} className="relative group/item">
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
                               <SidebarMenuButton isActive={activeAgendaId === agenda.id} onClick={() => setActiveAgendaId(agenda.id)} className="w-full justify-start h-10">
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    <span className="truncate flex-1">{agenda.name}</span>
                                     <DropdownMenuForAgenda
                                        onRename={() => {
                                            setEditingAgendaId(agenda.id);
                                            setEditingAgendaName(agenda.name);
                                        }}
                                        onDelete={() => handleDeleteAgenda(agenda.id)}
                                        disabled={agendaGroups.length <= 1}
                                    />
                                </SidebarMenuButton>
                            )}
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>
        </Sidebar>
    )
}

function DropdownMenuForAgenda({ onRename, onDelete, disabled }: { onRename: () => void; onDelete: () => void; disabled: boolean }) {
    return (
        <AlertDialog>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                     <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto opacity-0 group-hover/item:opacity-100">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={onRename}>
                        <Edit className="mr-2 h-4 w-4" /> Rename
                    </DropdownMenuItem>
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={disabled} className="text-destructive">
                            <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your agenda and all its tasks.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
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
        return <div className="flex-1" />; // Or a loading spinner
    }

    return (
        <>
            <AgendaSidebar
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
            <div className="flex-1 flex flex-col h-full">
                <Card className="flex-1 flex flex-col shadow-none border-none bg-transparent">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">{activeAgenda?.name || 'Select an Agenda'}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
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
                        <ul className="space-y-3 flex-1 overflow-y-auto pr-2">
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
                                        <Label htmlFor={`task-${task.id}`} className={`flex-1 text-lg transition-colors ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'} cursor-text`} onDoubleClick={() => handleStartEdit(task)}>
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
                    </CardContent>
                     {activeAgenda && totalTasks > 0 && (
                        <CardFooter className="justify-end gap-3 border-t pt-4">
                            {totalTasks > 0 && completedTasks === totalTasks ? (
                                <p className="text-lg font-semibold text-green-600 flex items-center gap-2">
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
            </div>
        </>
    );
}

    