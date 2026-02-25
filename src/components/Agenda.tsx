'use client';

import { useState, FormEvent, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Trash2, Edit, Save, MoreVertical, Trash, GripVertical, CheckCircle2, Circle, NotepadText, Eye, Archive, Menu, X, Sparkles, ListTodo, ChevronRight, ChevronLeft, FileText, Presentation, Calendar, Clock, CalendarClock, AlertTriangle, CalendarX, Pin, PinOff, Braces, Copy, ClipboardPaste, AlertCircle, LayoutList, GalleryHorizontalEnd, Layers, FlipVertical, ZoomIn, SlidersHorizontal, Wand2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

const SOUND_ENABLED_KEY = 'streamAgenda_soundEnabled';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";


interface Task {
  id: string;
  text: string;
  details: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
}

// Helper function to get relative time string
function getRelativeTimeString(dueDate: string): { text: string; isOverdue: boolean; urgency: 'overdue' | 'urgent' | 'soon' | 'normal' } {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const isOverdue = diffMs < 0;
  const absDiffMins = Math.abs(diffMins);
  const absDiffHours = Math.abs(diffHours);
  const absDiffDays = Math.abs(diffDays);

  let text: string;
  let urgency: 'overdue' | 'urgent' | 'soon' | 'normal';

  if (isOverdue) {
    urgency = 'overdue';
    if (absDiffDays >= 1) {
      text = `${absDiffDays} day${absDiffDays > 1 ? 's' : ''} overdue`;
    } else if (absDiffHours >= 1) {
      text = `${absDiffHours} hour${absDiffHours > 1 ? 's' : ''} overdue`;
    } else {
      text = `${absDiffMins} min${absDiffMins > 1 ? 's' : ''} overdue`;
    }
  } else {
    if (diffDays >= 7) {
      urgency = 'normal';
      text = `Due in ${diffDays} days`;
    } else if (diffDays >= 1) {
      urgency = diffDays <= 2 ? 'soon' : 'normal';
      text = `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours >= 1) {
      urgency = diffHours <= 4 ? 'urgent' : 'soon';
      text = `Due in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffMins > 0) {
      urgency = 'urgent';
      text = `Due in ${diffMins} min${diffMins > 1 ? 's' : ''}`;
    } else {
      urgency = 'urgent';
      text = 'Due now';
    }
  }

  return { text, isOverdue, urgency };
}

// Due Date Badge Component
function DueDateBadge({ dueDate, showAbsolute, onClick, completed }: { dueDate: string; showAbsolute: boolean; onClick: () => void; completed: boolean }) {
  const { text, isOverdue, urgency } = getRelativeTimeString(dueDate);
  const absoluteText = new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  if (completed) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1 hover:bg-muted/80 transition-colors"
      >
        <CalendarClock className="h-3 w-3" />
        {showAbsolute ? absoluteText : text}
      </button>
    );
  }

  const colorClasses = {
    overdue: 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20',
    urgent: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20',
    soon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20',
    normal: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20',
  };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "text-xs px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors font-medium",
        colorClasses[urgency]
      )}
      title={showAbsolute ? text : absoluteText}
    >
      {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
      {showAbsolute ? absoluteText : text}
    </button>
  );
}

// JSON Editor Dialog Component
function JsonEditorDialog({ tasks, onSave, trigger }: { tasks: Task[]; onSave: (tasks: Task[]) => void; trigger: React.ReactNode }) {
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When dialog opens, populate with current tasks
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Serialize tasks to clean JSON (only user-relevant fields)
      const cleanTasks = tasks.map(t => ({
        text: t.text,
        details: t.details,
        completed: t.completed,
        dueDate: t.dueDate || undefined,
      }));
      setJsonText(JSON.stringify(cleanTasks, null, 2));
      setJsonError(null);
    }
  };

  const validateAndParse = (text: string): { valid: boolean; tasks?: Task[]; error?: string } => {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        return { valid: false, error: 'JSON must be an array of tasks.' };
      }
      const now = new Date().toISOString();
      const validatedTasks: Task[] = parsed.map((item: any, index: number) => {
        if (typeof item.text !== 'string' || !item.text.trim()) {
          throw new Error(`Task at index ${index} must have a non-empty "text" field.`);
        }
        return {
          id: item.id && typeof item.id === 'string' ? item.id : crypto.randomUUID(),
          text: item.text.trim(),
          details: typeof item.details === 'string' ? item.details : '',
          completed: typeof item.completed === 'boolean' ? item.completed : false,
          createdAt: item.createdAt || now,
          updatedAt: now,
          dueDate: item.dueDate || undefined,
        };
      });
      return { valid: true, tasks: validatedTasks };
    } catch (e: any) {
      return { valid: false, error: e.message || 'Invalid JSON.' };
    }
  };

  const handleSave = () => {
    const result = validateAndParse(jsonText);
    if (result.valid && result.tasks) {
      onSave(result.tasks);
      setIsOpen(false);
    } else {
      setJsonError(result.error || 'Invalid JSON.');
    }
  };

  const handleTextChange = (value: string) => {
    setJsonText(value);
    if (jsonError) {
      // Clear error when user types
      setJsonError(null);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
    } catch (e) {
      // fallback
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonText(text);
      setJsonError(null);
    } catch (e) {
      // fallback
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e.message || 'Cannot format: invalid JSON.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Braces className="h-5 w-5 text-primary" />
            Edit Tasks as JSON
          </DialogTitle>
          <DialogDescription>
            Edit your tasks directly as JSON. Each task needs at least a <code className="bg-muted px-1 rounded text-xs">"text"</code> field. 
            You can paste a large list to bulk-add tasks.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleCopyToClipboard} className="h-7 text-xs gap-1">
            <Copy className="h-3 w-3" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handlePasteFromClipboard} className="h-7 text-xs gap-1">
            <ClipboardPaste className="h-3 w-3" /> Paste
          </Button>
          <Button variant="outline" size="sm" onClick={handleFormatJson} className="h-7 text-xs gap-1">
            <Braces className="h-3 w-3" /> Format
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">
            {(() => {
              try {
                const parsed = JSON.parse(jsonText);
                return Array.isArray(parsed) ? `${parsed.length} task${parsed.length !== 1 ? 's' : ''}` : '';
              } catch { return ''; }
            })()}
          </span>
        </div>

        {/* Error display */}
        {jsonError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{jsonError}</span>
          </div>
        )}

        {/* JSON Editor */}
        <div className="flex-1 min-h-0">
          <Textarea
            ref={textareaRef}
            value={jsonText}
            onChange={(e) => handleTextChange(e.target.value)}
            className={cn(
              "font-mono text-sm min-h-[300px] max-h-[50vh] resize-none transition-colors",
              jsonError && "border-destructive focus-visible:ring-destructive/50"
            )}
            spellCheck={false}
            placeholder={`[\n  {\n    "text": "My task",\n    "details": "Optional notes",\n    "completed": false,\n    "dueDate": "2026-03-01T10:00:00.000Z"\n  }\n]`}
          />
        </div>

        {/* Schema hint */}
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground transition-colors">JSON Schema Reference</summary>
          <pre className="mt-2 p-3 bg-muted rounded-lg overflow-auto text-[11px] leading-relaxed">{`{\n  "text": "string (required)",\n  "details": "string (optional, supports markdown)",\n  "completed": "boolean (optional, default: false)",\n  "dueDate": "ISO date string (optional)"\n}`}</pre>
        </details>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} className="gap-1">
            <Save className="h-4 w-4" /> Save Tasks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Due Date Editor Component  
function DueDateEditor({ dueDate, onSave, onRemove }: { dueDate?: string; onSave: (date: string) => void; onRemove: () => void }) {
  // Convert ISO string to local datetime-local format (YYYY-MM-DDTHH:mm)
  const toLocalDateTimeString = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [localDate, setLocalDate] = useState(toLocalDateTimeString(dueDate));
  
  const handleSave = () => {
    if (localDate) {
      // datetime-local gives us local time, convert to ISO
      onSave(new Date(localDate).toISOString());
    }
  };

  // Quick date buttons - set to local time
  const setQuickDate = (hours: number) => {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    setLocalDate(toLocalDateTimeString(date.toISOString()));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 flex-1">
      <Input
        type="datetime-local"
        value={localDate}
        onChange={(e) => setLocalDate(e.target.value)}
        className="w-auto h-7 text-xs px-2"
      />
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Quick:</span>
        <button onClick={() => setQuickDate(1)} className="text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors">1h</button>
        <button onClick={() => setQuickDate(4)} className="text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors">4h</button>
        <button onClick={() => setQuickDate(24)} className="text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors">1d</button>
        <button onClick={() => setQuickDate(24 * 7)} className="text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors">1w</button>
      </div>
      <div className="flex items-center gap-1 ml-auto">
        <Button size="sm" variant="outline" onClick={handleSave} disabled={!localDate} className="h-7 px-2 text-xs">
          <Save className="h-3 w-3 mr-1" /> Set
        </Button>
        {dueDate && (
          <Button size="sm" variant="ghost" onClick={onRemove} className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
            <CalendarX className="h-3 w-3 mr-1" /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}

interface AgendaGroup {
  id:string;
  name: string;
  tasks: Task[];
  archived: boolean;
  pinned?: boolean;
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
    handlePinAgenda,
    handleReorderAgendas,
    editingAgendaId,
    setEditingAgendaId,
    editingAgendaName,
    setEditingAgendaName,
    onClose,
    isMobile,
    sidebarWidth,
    onResizeStart,
    isResizing,
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
    handlePinAgenda: (id: string) => void;
    handleReorderAgendas: (draggedId: string, targetId: string) => void;
    editingAgendaId: string | null;
    setEditingAgendaId: (id: string | null) => void;
    editingAgendaName: string;
    setEditingAgendaName: (name: string) => void;
    onClose?: () => void;
    isMobile?: boolean;
    sidebarWidth?: number;
    onResizeStart?: (e: React.MouseEvent) => void;
    isResizing?: boolean;
}) {
    // Drag and drop state for reordering agendas
    const [draggedAgendaId, setDraggedAgendaId] = useState<string | null>(null);
    const [dragOverAgendaId, setDragOverAgendaId] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, agendaId: string) => {
        setDraggedAgendaId(agendaId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', agendaId);
    };

    const handleDragEnd = () => {
        setDraggedAgendaId(null);
        setDragOverAgendaId(null);
    };

    const handleDragOver = (e: React.DragEvent, agendaId: string) => {
        e.preventDefault();
        if (agendaId !== draggedAgendaId) {
            setDragOverAgendaId(agendaId);
        }
    };

    const handleDrop = (e: React.DragEvent, targetAgendaId: string) => {
        e.preventDefault();
        if (draggedAgendaId && draggedAgendaId !== targetAgendaId) {
            handleReorderAgendas(draggedAgendaId, targetAgendaId);
        }
        setDraggedAgendaId(null);
        setDragOverAgendaId(null);
    };

    const handleAgendaSelect = (id: string) => {
        setActiveAgendaId(id);
        if (isMobile && onClose) {
            onClose();
        }
    };
    return (
        <aside 
            className="flex flex-col border-r h-full bg-gradient-to-b from-card to-card/95 relative"
            style={{ width: isMobile ? '288px' : (sidebarWidth ?? 288) }}
        >
            {/* Resize handle - only show on desktop */}
            {!isMobile && onResizeStart && (
                <div
                    className={cn(
                        "absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-20 group",
                        "hover:bg-primary/30 active:bg-primary/50 transition-colors",
                        isResizing && "bg-primary/50"
                    )}
                    onMouseDown={onResizeStart}
                    title="Drag to resize sidebar"
                >
                    <div className={cn(
                        "absolute right-0 top-1/2 -translate-y-1/2 w-4 h-16 -mr-1.5 flex items-center justify-center",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        isResizing && "opacity-100"
                    )}>
                        <div className="w-1 h-10 rounded-full bg-primary/40 flex flex-col items-center justify-center gap-1">
                            <div className="w-0.5 h-1 rounded-full bg-primary" />
                            <div className="w-0.5 h-1 rounded-full bg-primary" />
                            <div className="w-0.5 h-1 rounded-full bg-primary" />
                        </div>
                    </div>
                </div>
            )}
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
                    {/* Sort agendas: pinned first, then unpinned */}
                    {agendaGroups
                        .filter(a => !a.archived)
                        .sort((a, b) => {
                            if (a.pinned && !b.pinned) return -1;
                            if (!a.pinned && b.pinned) return 1;
                            return 0;
                        })
                        .map(agenda => {
                        const taskCount = agenda.tasks.length;
                        const completedCount = agenda.tasks.filter(t => t.completed).length;
                        return (
                        <div 
                            key={agenda.id} 
                            className={cn(
                                "relative group/item",
                                draggedAgendaId === agenda.id && "opacity-50",
                                dragOverAgendaId === agenda.id && "ring-2 ring-primary ring-offset-1 rounded-lg"
                            )}
                            draggable={editingAgendaId !== agenda.id}
                            onDragStart={(e) => handleDragStart(e, agenda.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, agenda.id)}
                            onDragLeave={() => setDragOverAgendaId(null)}
                            onDrop={(e) => handleDrop(e, agenda.id)}
                        >
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
                                        "w-full justify-start h-auto py-2.5 px-3 gap-2 transition-all items-start",
                                        activeAgendaId === agenda.id && "shadow-sm ring-1 ring-primary/20"
                                    )}
                                >
                                    {/* Drag Handle */}
                                    <GripVertical className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 mt-1" />
                                    <div className={cn(
                                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors relative",
                                        activeAgendaId === agenda.id ? "bg-primary text-primary-foreground" : "bg-muted"
                                    )}>
                                        <FileText className="h-4 w-4" />
                                        {agenda.pinned && (
                                            <Pin className="h-3 w-3 absolute -top-1 -right-1 text-blue-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left min-w-0 overflow-hidden">
                                        <span className="font-medium whitespace-normal break-words block" style={{ wordBreak: 'break-word' }}>{agenda.name}</span>
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
                                        onPin={() => handlePinAgenda(agenda.id)}
                                        disabled={agendaGroups.filter(a => !a.archived).length <= 1}
                                        isArchived={false}
                                        isPinned={agenda.pinned ?? false}
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
                                        <Button variant={activeAgendaId === agenda.id ? "secondary" : "ghost"} onClick={() => handleAgendaSelect(agenda.id)} className="w-full justify-start h-auto min-h-10 py-2 gap-2 opacity-70 items-start">
                                            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                            <span className="flex-1 text-left whitespace-normal break-words" style={{ wordBreak: 'break-word' }}>{agenda.name}</span>
                                            <DropdownMenuForAgenda
                                                onRename={() => {
                                                    setEditingAgendaId(agenda.id);
                                                    setEditingAgendaName(agenda.name);
                                                }}
                                                onDelete={() => handleDeleteAgenda(agenda.id)}
                                                onArchive={() => handleArchiveAgenda(agenda.id)}
                                                onPin={() => handlePinAgenda(agenda.id)}
                                                disabled={false}
                                                isArchived={true}
                                                isPinned={agenda.pinned ?? false}
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

function DropdownMenuForAgenda({ onRename, onDelete, onArchive, onPin, disabled, isArchived, isPinned }: { onRename: () => void; onDelete: () => void; onArchive: () => void; onPin: () => void; disabled: boolean; isArchived: boolean; isPinned: boolean }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onSelect={onPin} className="text-blue-600 focus:text-blue-600 focus:bg-blue-600/10">
                    {isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                    {isPinned ? 'Unpin' : 'Pin to top'}
                </DropdownMenuItem>
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
    const [showPreview, setShowPreview] = useState(true);
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
                                    a: ({...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />,
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
    const [isPresentationMode, setIsPresentationMode] = useState(false);
    const [presentationSlideIndex, setPresentationSlideIndex] = useState(0);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
    const [presentationStyle, setPresentationStyle] = useState<'list' | 'slideshow'>('list');
    const [presentationAnimation, setPresentationAnimation] = useState<'stack' | 'flip' | 'fade' | 'slide' | 'zoom'>('stack');
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [recentlyCompletedTaskId, setRecentlyCompletedTaskId] = useState<string | null>(null);
    
    // Play completion sound using Web Audio API
    const playCompletionSound = useCallback(() => {
        // Check if sound is enabled
        const soundEnabled = localStorage.getItem(SOUND_ENABLED_KEY)
        if (soundEnabled === 'false') return
        
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // Create a soft, gentle "pop" sound
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Soft, low frequency for a gentle pop
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.type = 'sine';
            
            // Very quick, soft envelope
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
        } catch (e) {
            // Audio not supported, fail silently
        }
    }, []);
    
    // Sidebar resize state
    const [sidebarWidth, setSidebarWidth] = useState(288); // Default 288px (w-72)
    const [isResizing, setIsResizing] = useState(false);
    const minSidebarWidth = 200;
    const maxSidebarWidth = 500;

    // Handle sidebar resize
    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = Math.min(maxSidebarWidth, Math.max(minSidebarWidth, e.clientX));
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            // Save sidebar width to localStorage
            localStorage.setItem('sidebarWidth', String(sidebarWidth));
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing, sidebarWidth]);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Load from localStorage on initial render
    useEffect(() => {
        if (!isClient) return;
        try {
            // Load sidebar width
            const savedSidebarWidth = localStorage.getItem('sidebarWidth');
            if (savedSidebarWidth) {
                const width = parseInt(savedSidebarWidth, 10);
                if (width >= minSidebarWidth && width <= maxSidebarWidth) {
                    setSidebarWidth(width);
                }
            }
            
            const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                if (Array.isArray(parsedData) && parsedData.length > 0) {
                    // Quick migration for old data structure
                    const now = new Date().toISOString();
                    const migratedData = parsedData.map(group => ({
                        ...group,
                        archived: group.archived ?? false,
                        tasks: group.tasks.map((task: any) => ({
                            ...task,
                            details: task.details ?? '',
                            createdAt: task.createdAt ?? now,
                            updatedAt: task.updatedAt ?? now,
                            dueDate: task.dueDate,
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

    // Auto-detect presentation style based on whether tasks have details
    const hasTasksWithDetails = useMemo(() => {
        if (!activeAgenda) return false;
        return activeAgenda.tasks.some(t => t.details && t.details.trim().length > 0);
    }, [activeAgenda]);

    // When entering presentation mode, auto-pick style and reset slide
    const enterPresentationMode = useCallback((forceStyle?: 'list' | 'slideshow') => {
        setPresentationSlideIndex(0);
        setSlideDirection('right');
        setPresentationStyle(forceStyle ?? (hasTasksWithDetails ? 'slideshow' : 'list'));
        setIsPresentationMode(true);
    }, [hasTasksWithDetails]);

    const goToSlide = useCallback((index: number, direction: 'left' | 'right') => {
        setSlideDirection(direction);
        setPresentationSlideIndex(index);
    }, []);

    // Keyboard navigation for presentation mode
    useEffect(() => {
        if (!isPresentationMode) return;
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsPresentationMode(false);
            }
            if (presentationStyle === 'slideshow' && activeAgenda) {
                const maxIndex = activeAgenda.tasks.length - 1;
                if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
                    e.preventDefault();
                    setPresentationSlideIndex(prev => {
                        const next = Math.min(prev + 1, maxIndex);
                        setSlideDirection('right');
                        return next;
                    });
                }
                if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                    e.preventDefault();
                    setPresentationSlideIndex(prev => {
                        const next = Math.max(prev - 1, 0);
                        setSlideDirection('left');
                        return next;
                    });
                }
                if (e.key === 'Home') {
                    e.preventDefault();
                    setSlideDirection('left');
                    setPresentationSlideIndex(0);
                }
                if (e.key === 'End') {
                    e.preventDefault();
                    setSlideDirection('right');
                    setPresentationSlideIndex(maxIndex);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPresentationMode, presentationStyle, activeAgenda]);

    const updateTasksForActiveAgenda = (newTasks: Task[]) => {
        if (!activeAgendaId) return;
        setAgendaGroups(prev => prev.map(agenda =>
            agenda.id === activeAgendaId ? { ...agenda, tasks: newTasks } : agenda
        ));
    };

    const handleAddTask = (e: FormEvent) => {
        e.preventDefault();
        if (newTaskText.trim() && activeAgenda) {
            const now = new Date().toISOString();
            const taskId = crypto.randomUUID();
            const newTask: Task = {
                id: taskId,
                text: newTaskText.trim(),
                details: '',
                completed: false,
                createdAt: now,
                updatedAt: now,
            };
            updateTasksForActiveAgenda([...(activeAgenda.tasks || []), newTask]);
            setNewTaskText('');
            setExpandedTaskId(taskId); // Auto-expand the new task
        }
    };

    const handleDeleteTask = (id: string) => {
        if (!activeAgenda) return;
        updateTasksForActiveAgenda(activeAgenda.tasks.filter(task => task.id !== id));
    };

    const handleToggleTask = (id: string) => {
        if (!activeAgenda) return;
        const task = activeAgenda.tasks.find(t => t.id === id);
        const isCompleting = task && !task.completed;
        
        const now = new Date().toISOString();
        updateTasksForActiveAgenda(activeAgenda.tasks.map(task => task.id === id ? { ...task, completed: !task.completed, updatedAt: now } : task));
        
        // Play sound and trigger animation when completing (not uncompleting)
        if (isCompleting) {
            playCompletionSound();
            setRecentlyCompletedTaskId(id);
            // Clear the animation state after animation completes
            setTimeout(() => setRecentlyCompletedTaskId(null), 600);
        }
    };

    const handleStartEdit = (task: Task) => {
        setEditingTaskId(task.id);
        setEditingTaskText(task.text);
    };

    const handleSaveEdit = (id: string) => {
        if (editingTaskText.trim() && activeAgenda) {
            const now = new Date().toISOString();
            updateTasksForActiveAgenda(activeAgenda.tasks.map(task => task.id === id ? { ...task, text: editingTaskText.trim(), updatedAt: now } : task));
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
        const now = new Date().toISOString();
        updateTasksForActiveAgenda(activeAgenda.tasks.map(task =>
            task.id === taskId ? { ...task, details: newDetails, updatedAt: now } : task
        ));
    };

    const handleSetDueDate = (taskId: string, dueDate: string) => {
        if (!activeAgenda) return;
        const now = new Date().toISOString();
        updateTasksForActiveAgenda(activeAgenda.tasks.map(task =>
            task.id === taskId ? { ...task, dueDate, updatedAt: now } : task
        ));
    };

    const handleRemoveDueDate = (taskId: string) => {
        if (!activeAgenda) return;
        const now = new Date().toISOString();
        updateTasksForActiveAgenda(activeAgenda.tasks.map(task =>
            task.id === taskId ? { ...task, dueDate: undefined, updatedAt: now } : task
        ));
    };

    // State for toggling relative/absolute time display per task
    const [showAbsoluteTime, setShowAbsoluteTime] = useState<Record<string, boolean>>({});
    const toggleTimeDisplay = (taskId: string) => {
        setShowAbsoluteTime(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    };

    // Drag and drop state for reordering tasks
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', taskId);
        // Add a slight delay to allow the drag image to be created
        setTimeout(() => {
            const element = e.target as HTMLElement;
            element.style.opacity = '0.5';
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const element = e.target as HTMLElement;
        element.style.opacity = '1';
        setDraggedTaskId(null);
        setDragOverTaskId(null);
    };

    const handleDragOver = (e: React.DragEvent, taskId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (taskId !== draggedTaskId) {
            setDragOverTaskId(taskId);
        }
    };

    const handleDragLeave = () => {
        setDragOverTaskId(null);
    };

    const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
        e.preventDefault();
        if (!activeAgenda || !draggedTaskId || draggedTaskId === targetTaskId) {
            setDraggedTaskId(null);
            setDragOverTaskId(null);
            return;
        }

        const tasks = [...activeAgenda.tasks];
        const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
        const targetIndex = tasks.findIndex(t => t.id === targetTaskId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        // Remove the dragged task and insert it at the target position
        const [draggedTask] = tasks.splice(draggedIndex, 1);
        tasks.splice(targetIndex, 0, draggedTask);

        updateTasksForActiveAgenda(tasks);
        setDraggedTaskId(null);
        setDragOverTaskId(null);
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

    const handlePinAgenda = (agendaId: string) => {
        setAgendaGroups(prev => prev.map(agenda =>
            agenda.id === agendaId ? { ...agenda, pinned: !agenda.pinned } : agenda
        ));
    };

    const handleReorderAgendas = (draggedId: string, targetId: string) => {
        setAgendaGroups(prev => {
            const agendas = [...prev];
            const draggedIndex = agendas.findIndex(a => a.id === draggedId);
            const targetIndex = agendas.findIndex(a => a.id === targetId);
            
            if (draggedIndex === -1 || targetIndex === -1) return prev;
            
            const [draggedAgenda] = agendas.splice(draggedIndex, 1);
            agendas.splice(targetIndex, 0, draggedAgenda);
            
            return agendas;
        });
    };


    const activeTasks = activeAgenda?.tasks || [];
    const completedTasks = activeTasks.filter(task => task.completed).length;
    const totalTasks = activeTasks.length;

    if (!isClient) {
        // Render a placeholder or loading state on the server
        return (
            <div className="flex flex-1 overflow-hidden">
                <aside className="hidden md:flex shrink-0 w-72 flex-col border-r h-full bg-card" />
                <main className="flex-1 flex flex-col h-full min-w-0" />
            </div>
        )
    }

    return (
        <div className="flex flex-1 overflow-hidden relative">
            {/* Presentation Mode Overlay */}
            {isPresentationMode && activeAgenda && (
                <div className="fixed inset-0 z-[100] bg-gradient-to-br from-background via-background to-muted/30 flex flex-col animate-in fade-in duration-300">
                    {/* Top Bar - floating controls */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                        {/* Style toggle */}
                        <div className="flex items-center rounded-lg border bg-background/80 backdrop-blur-sm overflow-hidden">
                            <button
                                onClick={() => { setPresentationStyle('list'); setPresentationSlideIndex(0); }}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                                    presentationStyle === 'list' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                )}
                                title="List view"
                            >
                                <LayoutList className="h-3.5 w-3.5" /> List
                            </button>
                            <button
                                onClick={() => { setPresentationStyle('slideshow'); setPresentationSlideIndex(0); }}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                                    presentationStyle === 'slideshow' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                )}
                                title="Slideshow view"
                            >
                                <GalleryHorizontalEnd className="h-3.5 w-3.5" /> Cards
                            </button>
                        </div>
                        {/* Animation picker buttons */}
                        <div className="flex items-center rounded-lg border bg-background/80 backdrop-blur-sm overflow-hidden">
                            {([
                                { value: 'stack' as const, label: 'Stack', icon: Layers },
                                { value: 'flip' as const, label: 'Flip', icon: FlipVertical },
                                { value: 'slide' as const, label: 'Slide', icon: SlidersHorizontal },
                                { value: 'fade' as const, label: 'Fade', icon: Sparkles },
                                { value: 'zoom' as const, label: 'Zoom', icon: ZoomIn },
                            ]).map(anim => (
                                <button
                                    key={anim.value}
                                    onClick={() => setPresentationAnimation(anim.value)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors",
                                        presentationAnimation === anim.value
                                            ? "bg-primary text-primary-foreground"
                                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                    )}
                                    title={`${anim.label} animation`}
                                >
                                    <anim.icon className="h-3.5 w-3.5" />
                                    <span className="hidden lg:inline">{anim.label}</span>
                                </button>
                            ))}
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsPresentationMode(false)}
                            className="gap-1 bg-background/80 backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* ===== LIST MODE (original) ===== */}
                    {presentationStyle === 'list' && (
                        <div className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-auto" style={{ perspective: presentationAnimation === 'flip' ? '1200px' : undefined }}>
                            <div className={cn(
                                "w-full max-w-5xl bg-card rounded-2xl shadow-2xl border flex flex-col overflow-hidden",
                                `animate-list-${presentationAnimation}`
                            )}>
                                {/* Slide Header */}
                                <div className="px-6 py-4 md:px-8 md:py-5 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 border-b">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Presentation className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h1 className="text-lg md:text-xl font-bold text-foreground leading-tight truncate">
                                                {activeAgenda.name}
                                            </h1>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-sm shrink-0">
                                            <span>{completedTasks}/{activeAgenda.tasks.length}</span>
                                            <span>completed</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tasks List */}
                                <div className="flex-1 p-6 md:p-10 overflow-auto max-h-[60vh]">
                                    {activeAgenda.tasks.length > 0 ? (
                                        <ul className="space-y-4">
                                            {activeAgenda.tasks.map((task, index) => (
                                                <li 
                                                    key={task.id}
                                                    className={cn(
                                                        "flex items-start gap-4 p-4 rounded-xl border transition-all",
                                                        task.completed 
                                                            ? "bg-primary/5 border-primary/20 opacity-70" 
                                                            : "bg-muted/30 border-transparent hover:border-primary/20"
                                                    )}
                                                >
                                                    <button
                                                        onClick={() => handleToggleTask(task.id)}
                                                        className={cn(
                                                            "flex items-center justify-center h-8 w-8 rounded-full shrink-0 mt-0.5 transition-all",
                                                            task.completed 
                                                                ? "bg-primary text-primary-foreground" 
                                                                : "bg-primary/10 text-primary hover:bg-primary/20"
                                                        )}
                                                        aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
                                                    >
                                                        {task.completed ? (
                                                            <CheckCircle2 className="h-5 w-5" />
                                                        ) : (
                                                            <span className="font-bold text-sm">{index + 1}</span>
                                                        )}
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn(
                                                                "text-lg md:text-xl font-medium",
                                                                task.completed && "text-muted-foreground"
                                                            )}>
                                                                {task.text}
                                                            </span>
                                                        </div>
                                                        {task.details && (
                                                            <div className="mt-2 text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
                                                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                                                    a: ({...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
                                                                }}>
                                                                    {task.details}
                                                                </ReactMarkdown>
                                                            </div>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <p className="text-lg">No items in this agenda</p>
                                        </div>
                                    )}
                                </div>

                                {/* Slide Footer */}
                                <div className="px-8 py-4 border-t bg-muted/30 flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        {completedTasks === totalTasks && totalTasks > 0 ? (
                                            <span className="text-primary flex items-center gap-1">
                                                <CheckCircle2 className="h-4 w-4" /> All items completed!
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">
                                                {completedTasks} of {totalTasks} completed
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== SLIDESHOW MODE (stacked cards like PPT) ===== */}
                    {presentationStyle === 'slideshow' && activeAgenda.tasks.length > 0 && (() => {
                        const tasks = activeAgenda.tasks;
                        const currentIndex = presentationSlideIndex;
                        const isFirst = currentIndex === 0;
                        const isLast = currentIndex === tasks.length - 1;

                        // Render up to 2 cards behind + current + 2 ahead for depth stack
                        const visibleRange = [-2, -1, 0, 1, 2];

                        return (
                            <>
                                {/* Navigation arrows — side of screen */}
                                <button
                                    onClick={() => goToSlide(currentIndex - 1, 'left')}
                                    disabled={isFirst}
                                    className={cn(
                                        "absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full flex items-center justify-center transition-all",
                                        "bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-primary/10 hover:border-primary/30",
                                        isFirst && "opacity-30 cursor-not-allowed hover:bg-background/80 hover:border-border"
                                    )}
                                    aria-label="Previous slide"
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </button>
                                <button
                                    onClick={() => goToSlide(currentIndex + 1, 'right')}
                                    disabled={isLast}
                                    className={cn(
                                        "absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full flex items-center justify-center transition-all",
                                        "bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-primary/10 hover:border-primary/30",
                                        isLast && "opacity-30 cursor-not-allowed hover:bg-background/80 hover:border-border"
                                    )}
                                    aria-label="Next slide"
                                >
                                    <ChevronRight className="h-6 w-6" />
                                </button>

                                {/* Stacked cards container */}
                                <div className="flex-1 flex items-center justify-center px-16 md:px-24 py-6 md:py-12 overflow-hidden" style={{ perspective: '1200px' }}>
                                    <div className="relative w-full max-w-4xl" style={{ height: '70vh', maxHeight: '700px' }}>
                                        {(presentationAnimation === 'stack' ? visibleRange : [0]).map(offset => {
                                            const taskIndex = currentIndex + offset;
                                            if (taskIndex < 0 || taskIndex >= tasks.length) return null;
                                            const task = tasks[taskIndex];
                                            const absOffset = Math.abs(offset);

                                            // Stack positioning: cards behind go up & shrink, cards ahead go down & shrink
                                            const translateY = offset * -18;
                                            const scale = 1 - absOffset * 0.06;
                                            const zIndex = 10 - absOffset;
                                            const opacity = offset === 0 ? 1 : absOffset === 1 ? 0.55 : 0.25;
                                            const blur = absOffset >= 2 ? 2 : absOffset === 1 ? 1 : 0;
                                            const rotateX = offset * 1.5;

                                            // Choose animation class for the current (front) card
                                            const getAnimationClass = () => {
                                                if (offset !== 0) return '';
                                                const dir = slideDirection;
                                                switch (presentationAnimation) {
                                                    case 'stack': return dir === 'right' ? 'animate-stack-enter-right' : 'animate-stack-enter-left';
                                                    case 'flip': return dir === 'right' ? 'animate-flip-enter-right' : 'animate-flip-enter-left';
                                                    case 'slide': return dir === 'right' ? 'animate-slide-enter-right' : 'animate-slide-enter-left';
                                                    case 'fade': return 'animate-fade-enter';
                                                    case 'zoom': return dir === 'right' ? 'animate-zoom-enter-right' : 'animate-zoom-enter-left';
                                                    default: return '';
                                                }
                                            };

                                            return (
                                                <div
                                                    key={task.id + '-stack-' + offset}
                                                    className={cn(
                                                        "absolute inset-0 rounded-2xl border bg-card flex flex-col overflow-hidden transition-all duration-500 ease-out",
                                                        offset === 0 ? "shadow-2xl cursor-default" : "shadow-lg pointer-events-none",
                                                        getAnimationClass()
                                                    )}
                                                    style={presentationAnimation === 'stack' ? {
                                                        transform: `translateY(${translateY}px) scale(${scale}) rotateX(${rotateX}deg)`,
                                                        zIndex,
                                                        opacity: offset === 0 ? undefined : opacity,
                                                        filter: blur > 0 ? `blur(${blur}px)` : undefined,
                                                        transformOrigin: 'center center',
                                                    } : {
                                                        transformOrigin: presentationAnimation === 'flip' ? (slideDirection === 'right' ? 'right center' : 'left center') : 'center center',
                                                    }}
                                                >
                                                    {/* Only render full content for current card; behind cards show header teaser */}
                                                    {offset === 0 ? (
                                                        <>
                                                            {/* Card Header */}
                                                            <div className="px-6 py-4 md:px-10 md:py-6 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 border-b shrink-0">
                                                                <div className="flex items-center gap-4">
                                                                    <button
                                                                        onClick={() => handleToggleTask(task.id)}
                                                                        className={cn(
                                                                            "flex items-center justify-center h-12 w-12 rounded-full shrink-0 transition-all text-lg font-bold",
                                                                            task.completed
                                                                                ? "bg-primary text-primary-foreground"
                                                                                : "bg-primary/10 text-primary hover:bg-primary/20"
                                                                        )}
                                                                        aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
                                                                    >
                                                                        {task.completed ? (
                                                                            <CheckCircle2 className="h-7 w-7" />
                                                                        ) : (
                                                                            <span>{currentIndex + 1}</span>
                                                                        )}
                                                                    </button>
                                                                    <div className="flex-1 min-w-0">
                                                                        <h2 className={cn(
                                                                            "text-xl md:text-3xl font-bold leading-tight",
                                                                            task.completed && "line-through text-muted-foreground"
                                                                        )}>
                                                                            {task.text}
                                                                        </h2>
                                                                        {task.dueDate && (
                                                                            <div className="mt-2">
                                                                                <DueDateBadge
                                                                                    dueDate={task.dueDate}
                                                                                    showAbsolute={false}
                                                                                    onClick={() => {}}
                                                                                    completed={task.completed}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Card Body */}
                                                            <div className="flex-1 p-6 md:p-10 overflow-auto">
                                                                {task.details ? (
                                                                    <div className="prose prose-base md:prose-lg dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-headings:mb-3 prose-headings:mt-6 first:prose-headings:mt-0">
                                                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                                                            a: ({...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />,
                                                                            input: ({...props}) => {
                                                                                if(props.type === 'checkbox') {
                                                                                    return <Checkbox checked={props.checked} disabled className="mr-1.5" />
                                                                                }
                                                                                return <input {...props} />
                                                                            }
                                                                        }}>
                                                                            {task.details}
                                                                        </ReactMarkdown>
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-full flex items-center justify-center min-h-[120px]">
                                                                        <div className="text-center text-muted-foreground/50">
                                                                            <NotepadText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                                                            <p className="text-lg">No details for this task</p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Card Footer */}
                                                            <div className="px-6 py-3 md:px-10 md:py-4 border-t bg-muted/30 flex items-center justify-between shrink-0">
                                                                <span className="text-sm text-muted-foreground">
                                                                    {activeAgenda.name}
                                                                </span>
                                                                <div className="flex items-center gap-3">
                                                                    {/* Mini progress dots */}
                                                                    <div className="hidden md:flex items-center gap-1.5">
                                                                        {tasks.map((t, i) => (
                                                                            <button
                                                                                key={t.id}
                                                                                onClick={() => goToSlide(i, i > currentIndex ? 'right' : 'left')}
                                                                                className={cn(
                                                                                    "h-2 rounded-full transition-all",
                                                                                    i === currentIndex
                                                                                        ? "w-6 bg-primary"
                                                                                        : t.completed
                                                                                            ? "w-2 bg-primary/40"
                                                                                            : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                                                                                )}
                                                                                aria-label={`Go to slide ${i + 1}`}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                    <span className="text-sm font-medium text-muted-foreground">
                                                                        {currentIndex + 1} / {tasks.length}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        /* Behind/ahead cards — show just a teaser header */
                                                        <div className="px-6 py-4 md:px-10 md:py-6 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 flex-1">
                                                            <div className="flex items-center gap-4">
                                                                <div className={cn(
                                                                    "flex items-center justify-center h-10 w-10 rounded-full shrink-0 text-sm font-bold",
                                                                    task.completed
                                                                        ? "bg-primary/30 text-primary-foreground/70"
                                                                        : "bg-primary/10 text-primary/60"
                                                                )}>
                                                                    {task.completed ? (
                                                                        <CheckCircle2 className="h-5 w-5" />
                                                                    ) : (
                                                                        <span>{taskIndex + 1}</span>
                                                                    )}
                                                                </div>
                                                                <span className={cn(
                                                                    "text-lg font-semibold truncate",
                                                                    task.completed && "line-through text-muted-foreground"
                                                                )}>
                                                                    {task.text}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                    {/* Slideshow empty state */}
                    {presentationStyle === 'slideshow' && activeAgenda.tasks.length === 0 && (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                                <p className="text-lg">No items in this agenda</p>
                            </div>
                        </div>
                    )}

                    {/* Keyboard Hint */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/50">
                        {presentationStyle === 'slideshow'
                            ? 'Use ← → arrows or Space to navigate · ESC to exit'
                            : 'Press ESC to exit'
                        }
                    </div>
                </div>
            )}

            {/* Mobile sidebar overlay */}
            {isMobileSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden" 
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}
            
            {/* Desktop sidebar */}
            <div className="hidden md:flex shrink-0 h-full">
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
                    handlePinAgenda={handlePinAgenda}
                    handleReorderAgendas={handleReorderAgendas}
                    editingAgendaId={editingAgendaId}
                    setEditingAgendaId={setEditingAgendaId}
                    editingAgendaName={editingAgendaName}
                    setEditingAgendaName={setEditingAgendaName}
                    sidebarWidth={sidebarWidth}
                    onResizeStart={handleResizeStart}
                    isResizing={isResizing}
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
                    handlePinAgenda={handlePinAgenda}
                    handleReorderAgendas={handleReorderAgendas}
                    editingAgendaId={editingAgendaId}
                    setEditingAgendaId={setEditingAgendaId}
                    editingAgendaName={editingAgendaName}
                    setEditingAgendaName={setEditingAgendaName}
                    onClose={() => setIsMobileSidebarOpen(false)}
                    isMobile={true}
                />
            </div>
            
            <main className="flex-1 flex flex-col h-full min-w-0 bg-gradient-to-br from-background to-muted/20" style={{overflow:"auto"}}>
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
                            {activeAgenda && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <JsonEditorDialog
                                        tasks={activeAgenda.tasks}
                                        onSave={(newTasks) => updateTasksForActiveAgenda(newTasks)}
                                        trigger={
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                className="gap-2 rounded-lg hover:bg-primary/10 hover:border-primary/30"
                                                aria-label="Edit tasks as JSON"
                                            >
                                                <Braces className="h-4 w-4" />
                                                <span className="hidden sm:inline">JSON</span>
                                            </Button>
                                        }
                                    />
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => enterPresentationMode()}
                                        className="gap-2 rounded-lg hover:bg-primary/10 hover:border-primary/30"
                                        aria-label="Present agenda"
                                    >
                                        <Presentation className="h-4 w-4" />
                                        <span className="hidden sm:inline">Present</span>
                                    </Button>
                                </div>
                            )}
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
                                {activeTasks.map((task, index) => {
                                    const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
                                    const isUrgent = task.dueDate && !task.completed && !isOverdue && (new Date(task.dueDate).getTime() - new Date().getTime()) < 4 * 60 * 60 * 1000;
                                    return (
                                     <li 
                                        key={task.id} 
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => handleDragOver(e, task.id)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, task.id)}
                                        className={cn(
                                            "group rounded-xl border bg-card shadow-sm transition-all duration-200 hover:shadow-md",
                                            task.completed && "opacity-60 bg-muted/50",
                                            isOverdue && "border-l-4 border-l-red-500 bg-red-500/5",
                                            isUrgent && !isOverdue && "border-l-4 border-l-orange-500 bg-orange-500/5",
                                            draggedTaskId === task.id && "opacity-50 scale-[0.98]",
                                            dragOverTaskId === task.id && "ring-2 ring-primary ring-offset-2",
                                            recentlyCompletedTaskId === task.id && "animate-task-complete"
                                        )}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <Collapsible 
                                            open={expandedTaskId === task.id} 
                                            onOpenChange={(open) => setExpandedTaskId(open ? task.id : null)}
                                        >
                                            <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4">
                                                {/* Drag Handle */}
                                                <div 
                                                    className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                >
                                                    <GripVertical className="h-4 w-4 md:h-5 md:w-5" />
                                                </div>
                                                <div className={cn(
                                                    "relative",
                                                    recentlyCompletedTaskId === task.id && "animate-checkbox-pop"
                                                )}>
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
                                                        <CheckCircle2 className={cn(
                                                            "absolute inset-0 h-5 w-5 md:h-6 md:w-6 text-green-500 pointer-events-none",
                                                            recentlyCompletedTaskId === task.id && "animate-checkmark"
                                                        )} />
                                                    )}
                                                    {/* Celebration particles */}
                                                    {recentlyCompletedTaskId === task.id && (
                                                        <>
                                                            <span className="absolute inset-0 animate-ping-once rounded-full bg-green-400/50" />
                                                            <span className="absolute -top-1 -left-1 w-2 h-2 bg-green-400 rounded-full animate-particle-1" />
                                                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-particle-2" />
                                                            <span className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-teal-400 rounded-full animate-particle-3" />
                                                            <span className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-green-300 rounded-full animate-particle-4" />
                                                        </>
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
                                                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                            {task.dueDate && (
                                                                <DueDateBadge 
                                                                    dueDate={task.dueDate} 
                                                                    showAbsolute={showAbsoluteTime[task.id] ?? false}
                                                                    onClick={() => toggleTimeDisplay(task.id)}
                                                                    completed={task.completed}
                                                                />
                                                            )}
                                                            {task.details && (
                                                                <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                                                                    <NotepadText className="h-3 w-3" /> Has notes
                                                                </span>
                                                            )}
                                                        </div>
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
                                                {/* Task metadata: Created, Updated, and Due Date */}
                                                <div className="px-3 md:px-4 pt-2 pb-3 border-t border-dashed space-y-2">
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            Created: {new Date(task.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            Updated: {new Date(task.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {task.dueDate && (
                                                            <span className="flex items-center gap-1 ml-auto">
                                                                <CalendarClock className="h-3 w-3" />
                                                                Due: {new Date(task.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Due Date Editor */}
                                                    <div className="flex items-center gap-2">
                                                        <CalendarClock className="h-3 w-3 text-muted-foreground shrink-0" />
                                                        <span className="text-xs text-muted-foreground">Due:</span>
                                                        <DueDateEditor 
                                                            dueDate={task.dueDate}
                                                            onSave={(date) => handleSetDueDate(task.id, date)}
                                                            onRemove={() => handleRemoveDueDate(task.id)}
                                                        />
                                                    </div>
                                                </div>
                                                <TaskDetails task={task} onSave={(newDetails) => handleSaveDetails(task.id, newDetails)} />
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </li>
                                    );
                                })}
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
