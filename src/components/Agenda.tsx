'use client';

import { useState, FormEvent, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Trash2, Edit, Save, MoreVertical, Trash, GripVertical, CheckCircle2, Circle, NotepadText, Eye, Archive, Menu, X, Sparkles, ListTodo, ChevronRight, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from '@/components/ui/progress';


interface Task {
  id: string;
  text: string;
  details: string;
  completed: boolean;
}

interface AgendaGroup {
  id:string;
  name: string;
  tasks: Task[];
  archived: boolean;
}

const LOCAL_STORAGE_KEY = 'streamAgendaData_v3';

const getDefaultAgendas = (): AgendaGroup[] => {
    return [
      {
        id: crypto.randomUUID(),
        name: 'My First Agenda',
        tasks: [],
        archived: false,
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
    handleArchiveAgenda,
    editingAgendaId,
    setEditingAgendaId,
    editingAgendaName,
    setEditingAgendaName,
    onClose,
    isMobile,
}: {
    agendaGroups: AgendaGroup[];
    activeAgendaId: string | null;
    setActiveAgendaId: (id: string) => void;
    handleCreateAgenda: () => void;
    newAgendaName: string;
    setNewAgendaName: (name: string) => void;
    handleDeleteAgenda: (id: string) => void;
    handleRenameAgenda: (id: string) => void;
    handleArchiveAgenda: (id: string) => void;
    editingAgendaId: string | null;
    setEditingAgendaId: (id: string | null) => void;
    editingAgendaName: string;
    setEditingAgendaName: (name: string) => void;
    onClose?: () => void;
    isMobile?: boolean;
}) {
    const handleAgendaSelect = (id: string) => {
        setActiveAgendaId(id);
        if (isMobile && onClose) {
            onClose();
        }
    };
    return (
        <aside className="w-72 flex flex-col border-r h-full bg-gradient-to-b from-card to-card/95">
            <div className="p-3 border-b bg-card/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <ListTodo className="h-4 w-4 text-primary" />
                        </div>
                        <h2 className="text-lg font-semibold tracking-tight">My Agendas</h2>
                    </div>
                    {isMobile && onClose && (
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                            <X className="h-5 w-5" />
                        </Button>
                    )}
                </div>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="sm" className="w-full group transition-all hover:shadow-md">
                            <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" /> New Agenda
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
                <div className="p-2 space-y-1">
                    {agendaGroups.filter(a => !a.archived).map(agenda => {
                        const taskCount = agenda.tasks.length;
                        const completedCount = agenda.tasks.filter(t => t.completed).length;
                        return (
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
                               <Button 
                                    variant={activeAgendaId === agenda.id ? "secondary" : "ghost"} 
                                    onClick={() => handleAgendaSelect(agenda.id)} 
                                    className={cn(
                                        "w-full justify-start h-auto py-2.5 px-3 gap-3 transition-all",
                                        activeAgendaId === agenda.id && "shadow-sm ring-1 ring-primary/20"
                                    )}
                                >
                                    <div className={cn(
                                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                        activeAgendaId === agenda.id ? "bg-primary text-primary-foreground" : "bg-muted"
                                    )}>
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <span className="truncate block font-medium">{agenda.name}</span>
                                        {taskCount > 0 && (
                                            <span className="text-xs text-muted-foreground">
                                                {completedCount}/{taskCount} completed
                                            </span>
                                        )}
                                    </div>
                                    <DropdownMenuForAgenda
                                        onRename={() => {
                                            setEditingAgendaId(agenda.id);
                                            setEditingAgendaName(agenda.name);
                                        }}
                                        onDelete={() => handleDeleteAgenda(agenda.id)}
                                        onArchive={() => handleArchiveAgenda(agenda.id)}
                                        disabled={agendaGroups.filter(a => !a.archived).length <= 1}
                                        isArchived={false}
                                    />
                                </Button>
                            )}
                        </div>
                    )})}
                    
                    {agendaGroups.filter(a => a.archived).length > 0 && (
                        <Collapsible className="mt-4 pt-4 border-t">
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground h-10 group">
                                    <Archive className="h-4 w-4" />
                                    <span className="flex-1 text-left">Archived</span>
                                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{agendaGroups.filter(a => a.archived).length}</span>
                                    <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-1 mt-1">
                                {agendaGroups.filter(a => a.archived).map(agenda => (
                                    <div key={agenda.id} className="relative group/item">
                                        <Button variant={activeAgendaId === agenda.id ? "secondary" : "ghost"} onClick={() => handleAgendaSelect(agenda.id)} className="w-full justify-start h-10 gap-2 opacity-70">
                                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                                            <span className="truncate flex-1 text-left">{agenda.name}</span>
                                            <DropdownMenuForAgenda
                                                onRename={() => {
                                                    setEditingAgendaId(agenda.id);
                                                    setEditingAgendaName(agenda.name);
                                                }}
                                                onDelete={() => handleDeleteAgenda(agenda.id)}
                                                onArchive={() => handleArchiveAgenda(agenda.id)}
                                                disabled={false}
                                                isArchived={true}
                                            />
                                        </Button>
                                    </div>
                                ))}
                            </CollapsibleContent>
                        </Collapsible>
                    )}
                </div>
            </ScrollArea>
        </aside>
    )
}

function DropdownMenuForAgenda({ onRename, onDelete, onArchive, disabled, isArchived }: { onRename: () => void; onDelete: () => void; onArchive: () => void; disabled: boolean; isArchived: boolean }) {
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
                <DropdownMenuItem onSelect={onArchive} className="text-amber-600 focus:text-amber-600 focus:bg-amber-600/10">
                    <Archive className="mr-2 h-4 w-4" /> {isArchived ? 'Unarchive' : 'Archive'}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onDelete} disabled={disabled} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}


function TaskDetails({ task, onSave }: { task: Task, onSave: (details: string) => void }) {
    const [details, setDetails] = useState(task.details);
    const [isSaving, setIsSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setDetails(task.details);
    }, [task.details]);

    const handleSave = useCallback(() => {
        setIsSaving(true);
        onSave(details);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            setIsSaving(false);
        }, 1000);
    }, [details, onSave]);

    // Auto-save after 1 second of inactivity
    const handleChange = useCallback((value: string) => {
        setDetails(value);
        if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = setTimeout(() => {
            setIsSaving(true);
            onSave(value);
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
                setIsSaving(false);
            }, 1000);
        }, 1000);
    }, [onSave]);

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
        };
    }, []);

    const hasContent = details.trim().length > 0;

    return (
        <div className="px-3 md:px-4 pb-4">
            {/* Header with toggle and status */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-muted-foreground">Details</Label>
                    {hasContent && (
                        <span className="text-xs text-muted-foreground/70">
                            {details.length} chars
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isSaving ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Saving...
                        </span>
                    ) : hasContent ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            Saved
                        </span>
                    ) : null}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        className={cn("h-7 px-2 text-xs", showPreview && "bg-muted")}
                    >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                    </Button>
                </div>
            </div>

            {/* Main content area */}
            <div className={cn(
                "grid gap-3 transition-all duration-200",
                showPreview ? "md:grid-cols-2" : "grid-cols-1"
            )}>
                {/* Editor */}
                <div className="relative">
                    <Textarea
                        placeholder="Add notes using Markdown..."
                        value={details}
                        onChange={(e) => handleChange(e.target.value)}
                        onBlur={handleSave}
                        className="text-sm min-h-[140px] resize-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                        rows={6}
                    />
                    {!hasContent && (
                        <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
                            <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground/60">
                                <span className="bg-muted/50 px-1.5 py-0.5 rounded">**bold**</span>
                                <span className="bg-muted/50 px-1.5 py-0.5 rounded">*italic*</span>
                                <span className="bg-muted/50 px-1.5 py-0.5 rounded">- [ ] todo</span>
                                <span className="bg-muted/50 px-1.5 py-0.5 rounded">[link](url)</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Preview pane */}
                {showPreview && (
                    <div className="rounded-md border bg-muted/30 min-h-[140px] p-3 overflow-auto">
                        {hasContent ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                    input: ({...props}) => {
                                        if(props.type === 'checkbox') {
                                            return <Checkbox checked={props.checked} disabled className="mr-1.5" />
                                        }
                                        return <input {...props} />
                                    }
                                }}>
                                    {details}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground/50 text-sm">
                                <div className="text-center">
                                    <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>Preview will appear here</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
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
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
                    // Quick migration for old data structure
                    const migratedData = parsedData.map(group => ({
                        ...group,
                        archived: group.archived ?? false,
                        tasks: group.tasks.map((task: any) => ({
                            ...task,
                            details: task.details ?? '',
                        }))
                    }));
                    setAgendaGroups(migratedData);
                    const activeId = localStorage.getItem('activeAgendaId');
                    setActiveAgendaId(activeId && migratedData.some(g => g.id === activeId) ? activeId : migratedData[0].id);
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
                details: '',
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

    const handleSaveDetails = (taskId: string, newDetails: string) => {
        if (!activeAgenda) return;
        updateTasksForActiveAgenda(activeAgenda.tasks.map(task =>
            task.id === taskId ? { ...task, details: newDetails } : task
        ));
    };

    const handleCreateAgenda = () => {
        if (newAgendaName.trim()) {
            const newAgenda: AgendaGroup = {
                id: crypto.randomUUID(),
                name: newAgendaName.trim(),
                tasks: [],
                archived: false,
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

    const handleArchiveAgenda = (agendaId: string) => {
        setAgendaGroups(prev => prev.map(agenda =>
            agenda.id === agendaId ? { ...agenda, archived: !agenda.archived } : agenda
        ));
    };


    const activeTasks = activeAgenda?.tasks || [];
    const completedTasks = activeTasks.filter(task => task.completed).length;
    const totalTasks = activeTasks.length;

    if (!isClient) {
        // Render a placeholder or loading state on the server
        return (
            <div className="flex-1 flex overflow-hidden">
                <aside className="hidden md:flex w-64 flex-col border-r h-full bg-card" />
                <main className="flex-1 flex flex-col h-full" />
            </div>
        )
    }

    return (
        <div className="flex flex-1 overflow-hidden relative">
            {/* Mobile sidebar overlay */}
            {isMobileSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden" 
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}
            
            {/* Desktop sidebar */}
            <div className="hidden md:block">
                <AgendaList
                    agendaGroups={agendaGroups}
                    activeAgendaId={activeAgendaId}
                    setActiveAgendaId={setActiveAgendaId}
                    handleCreateAgenda={handleCreateAgenda}
                    newAgendaName={newAgendaName}
                    setNewAgendaName={setNewAgendaName}
                    handleDeleteAgenda={handleDeleteAgenda}
                    handleRenameAgenda={handleRenameAgenda}
                    handleArchiveAgenda={handleArchiveAgenda}
                    editingAgendaId={editingAgendaId}
                    setEditingAgendaId={setEditingAgendaId}
                    editingAgendaName={editingAgendaName}
                    setEditingAgendaName={setEditingAgendaName}
                />
            </div>
            
            {/* Mobile sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ease-in-out",
                isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <AgendaList
                    agendaGroups={agendaGroups}
                    activeAgendaId={activeAgendaId}
                    setActiveAgendaId={setActiveAgendaId}
                    handleCreateAgenda={handleCreateAgenda}
                    newAgendaName={newAgendaName}
                    setNewAgendaName={setNewAgendaName}
                    handleDeleteAgenda={handleDeleteAgenda}
                    handleRenameAgenda={handleRenameAgenda}
                    handleArchiveAgenda={handleArchiveAgenda}
                    editingAgendaId={editingAgendaId}
                    setEditingAgendaId={setEditingAgendaId}
                    editingAgendaName={editingAgendaName}
                    setEditingAgendaName={setEditingAgendaName}
                    onClose={() => setIsMobileSidebarOpen(false)}
                    isMobile={true}
                />
            </div>
            
            <main className="flex-1 flex flex-col h-full bg-gradient-to-br from-background to-muted/20" style={{overflow:"auto"}}>
                <Card className="flex-1 flex flex-col shadow-none border-none bg-transparent rounded-none">
                    <CardHeader className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="md:hidden h-9 w-9 hover:bg-primary/10" 
                                onClick={() => setIsMobileSidebarOpen(true)}
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                            <div className="flex-1 min-w-0">
                                <CardTitle className="text-xl md:text-2xl font-bold truncate">
                                    {activeAgenda?.name || 'Select an Agenda'}
                                </CardTitle>
                                {activeAgenda && totalTasks > 0 && (
                                    <div className="flex items-center gap-3 mt-2">
                                        <Progress 
                                            value={(completedTasks / totalTasks) * 100} 
                                            className="h-2 flex-1 max-w-xs" 
                                        />
                                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                                            {completedTasks} of {totalTasks} done
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <div className="flex-1 flex flex-col gap-4 p-4 md:p-6 overflow-hidden">
                        <form onSubmit={handleAddTask} className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    value={newTaskText}
                                    onChange={(e) => setNewTaskText(e.target.value)}
                                    placeholder="What needs to be covered?"
                                    className="text-base h-12 pl-4 pr-4 rounded-xl border-2 border-transparent focus:border-primary/30 transition-all shadow-sm"
                                    disabled={!activeAgenda}
                                />
                            </div>
                            <Button 
                                type="submit" 
                                size="lg" 
                                aria-label="Add task" 
                                disabled={!activeAgenda || !newTaskText.trim()}
                                className="h-12 px-4 rounded-xl shadow-sm hover:shadow-md transition-all"
                            >
                                <Plus className="h-5 w-5" />
                                <span className="hidden sm:inline ml-2">Add</span>
                            </Button>
                        </form>
                        <ScrollArea className="-mr-4 pr-4 flex-1">
                            <ul className="space-y-2 pr-2">
                                {activeTasks.map((task, index) => (
                                     <li 
                                        key={task.id} 
                                        className={cn(
                                            "group rounded-xl border bg-card shadow-sm transition-all duration-200 hover:shadow-md",
                                            task.completed && "opacity-60 bg-muted/50"
                                        )}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <Collapsible>
                                            <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4">
                                                <div className="relative">
                                                    <Checkbox 
                                                        id={`task-${task.id}`} 
                                                        checked={task.completed} 
                                                        onCheckedChange={() => handleToggleTask(task.id)} 
                                                        className={cn(
                                                            "h-5 w-5 md:h-6 md:w-6 rounded-full shrink-0 transition-all",
                                                            task.completed && "bg-green-500 border-green-500"
                                                        )} 
                                                    />
                                                    {task.completed && (
                                                        <CheckCircle2 className="absolute inset-0 h-5 w-5 md:h-6 md:w-6 text-green-500 pointer-events-none" />
                                                    )}
                                                </div>
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
                                                        className="flex-1 h-9 text-base md:text-lg"
                                                    />
                                                ) : (
                                                    <div className="flex-1 min-w-0">
                                                        <Label htmlFor={`task-${task.id}`} className={cn('text-base md:text-lg transition-colors cursor-text break-words block', task.completed ? 'line-through text-muted-foreground' : 'text-foreground')} onDoubleClick={() => handleStartEdit(task)}>
                                                            {task.text}
                                                        </Label>
                                                        {task.details && (
                                                            <span className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                                                                <NotepadText className="h-3 w-3" /> Has notes
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="flex gap-0.5 md:gap-1 ml-auto shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                     <CollapsibleTrigger asChild>
                                                        <Button variant="ghost" size="icon" aria-label="Toggle details" className="h-8 w-8 md:h-9 md:w-9 rounded-lg hover:bg-primary/10">
                                                            <NotepadText className={cn("h-4 w-4 md:h-5 md:w-5", task.details ? "text-primary" : "text-muted-foreground")} />
                                                        </Button>
                                                    </CollapsibleTrigger>
                                                    {editingTaskId === task.id ? (
                                                        <Button variant="ghost" size="icon" onMouseDown={(e) => { e.preventDefault(); handleSaveEdit(task.id) }} aria-label="Save task" className="h-8 w-8 md:h-9 md:w-9 rounded-lg hover:bg-green-500/10">
                                                            <Save className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                                                        </Button>
                                                    ) : (
                                                        <Button variant="ghost" size="icon" onClick={() => handleStartEdit(task)} aria-label="Edit task" className="h-8 w-8 md:h-9 md:w-9 rounded-lg hover:bg-primary/10">
                                                            <Edit className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)} aria-label="Delete task" className="h-8 w-8 md:h-9 md:w-9 rounded-lg hover:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground hover:text-destructive" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <CollapsibleContent>
                                                <TaskDetails task={task} onSave={(newDetails) => handleSaveDetails(task.id, newDetails)} />
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </li>
                                ))}
                                {totalTasks === 0 && activeAgenda && (
                                    <div className="text-center py-16 flex flex-col justify-center items-center">
                                        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                                            <Sparkles className="h-10 w-10 text-muted-foreground/50" />
                                        </div>
                                        <p className="text-xl font-semibold text-foreground mb-2">Ready to get started?</p>
                                        <p className="text-muted-foreground max-w-sm">Add your first agenda item above to begin tracking your topics.</p>
                                    </div>
                                )}
                                {!activeAgenda && isClient && (
                                    <div className="text-center py-16 flex flex-col justify-center items-center">
                                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                                            <ListTodo className="h-10 w-10 text-primary/50" />
                                        </div>
                                        <p className="text-xl font-semibold text-foreground mb-2">Welcome to StreamAgenda</p>
                                        <p className="text-muted-foreground max-w-sm">Select an agenda from the sidebar or create a new one to get started.</p>
                                    </div>
                                )}
                            </ul>
                        </ScrollArea>
                    </div>
                     {activeAgenda && totalTasks > 0 && (
                        <CardFooter className="justify-center gap-3 border-t py-4 bg-card/50 backdrop-blur-sm">
                            {completedTasks === totalTasks ? (
                                <div className="flex items-center gap-3 bg-green-500/10 text-green-600 dark:text-green-400 px-6 py-3 rounded-full">
                                    <CheckCircle2 className="h-6 w-6" />
                                    <span className="text-lg font-semibold">All items covered!</span>
                                    <span className="text-2xl">🎉</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <span className="text-3xl font-bold text-primary">{completedTasks}</span>
                                        <span className="text-lg">/</span>
                                        <span className="text-xl font-medium">{totalTasks}</span>
                                    </div>
                                    <span className="text-muted-foreground">items completed</span>
                                </div>
                            )}
                        </CardFooter>
                    )}
                </Card>
            </main>
        </div>
    );
}
