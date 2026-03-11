'use client';

import { useState, FormEvent, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { loadUserData, saveUserData } from '@/lib/firestore';
import {
  Plus, Trash2, Edit, Save, MoreVertical, Trash, GripVertical, CheckCircle2,
  NotepadText, Eye, Archive, Menu, X, Sparkles, ListTodo, ChevronRight,
  ChevronLeft, ChevronDown, FileText, Presentation, Calendar, Clock,
  CalendarClock, AlertTriangle, CalendarX, Pin, PinOff, Braces, Copy,
  ClipboardPaste, AlertCircle, LayoutList, GalleryHorizontalEnd, Layers,
  FlipVertical, ZoomIn, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown,
  PanelLeftClose, PanelLeftOpen, ChevronsDownUp, ChevronsUpDown, Pencil,
  Eraser, Minus, Cloud, CloudOff, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";

const SOUND_ENABLED_KEY = 'streamAgenda_soundEnabled';

// ─── Types ───────────────────────────────────────────────────────────────────

type SortField = 'manual' | 'dueDate' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

interface Task {
  id: string;
  text: string;
  details: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
}

interface AgendaGroup {
  id: string;
  name: string;
  tasks: Task[];
  archived: boolean;
  pinned?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRelativeTimeString(dueDate: string) {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const isOverdue = diffMs < 0;
  const abs = (n: number) => Math.abs(n);
  let text: string;
  let urgency: 'overdue' | 'urgent' | 'soon' | 'normal';

  if (isOverdue) {
    urgency = 'overdue';
    text = abs(diffDays) >= 1 ? `${abs(diffDays)}d overdue` : abs(diffHours) >= 1 ? `${abs(diffHours)}h overdue` : `${abs(diffMins)}m overdue`;
  } else if (diffDays >= 7) { urgency = 'normal'; text = `${diffDays}d`; }
  else if (diffDays >= 1) { urgency = diffDays <= 2 ? 'soon' : 'normal'; text = `${diffDays}d`; }
  else if (diffHours >= 1) { urgency = diffHours <= 4 ? 'urgent' : 'soon'; text = `${diffHours}h`; }
  else if (diffMins > 0) { urgency = 'urgent'; text = `${diffMins}m`; }
  else { urgency = 'urgent'; text = 'now'; }

  return { text, isOverdue, urgency };
}

const getDefaultAgendas = (): AgendaGroup[] => [{
  id: crypto.randomUUID(), name: 'My First Agenda', tasks: [], archived: false,
}];

// ─── DueDateBadge ────────────────────────────────────────────────────────────

function DueDateBadge({ dueDate, showAbsolute, onClick, completed }: { dueDate: string; showAbsolute: boolean; onClick: () => void; completed: boolean }) {
  const { text, isOverdue, urgency } = getRelativeTimeString(dueDate);
  const abs = new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (completed) {
    return (<button onClick={e => { e.stopPropagation(); onClick(); }} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground flex items-center gap-1 hover:bg-muted/80 transition-colors"><CalendarClock className="h-3 w-3" />{showAbsolute ? abs : text}</button>);
  }
  const colors = { overdue: 'bg-red-500/10 text-red-600 dark:text-red-400', urgent: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', soon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', normal: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' };
  return (<button onClick={e => { e.stopPropagation(); onClick(); }} className={cn("text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1 font-semibold transition-colors", colors[urgency])} title={showAbsolute ? text : abs}>{isOverdue ? <AlertTriangle className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}{showAbsolute ? abs : text}</button>);
}

// ─── DueDateEditor ───────────────────────────────────────────────────────────

function DueDateEditor({ dueDate, onSave, onRemove }: { dueDate?: string; onSave: (date: string) => void; onRemove: () => void }) {
  const toLocal = (iso?: string) => { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
  const [localDate, setLocalDate] = useState(toLocal(dueDate));
  const setQuick = (h: number) => { const d = new Date(); d.setHours(d.getHours() + h); setLocalDate(toLocal(d.toISOString())); };
  return (
    <div className="flex flex-wrap items-center gap-2 flex-1">
      <Input type="datetime-local" value={localDate} onChange={e => setLocalDate(e.target.value)} className="w-auto h-7 text-xs px-2 rounded-lg" />
      <div className="flex items-center gap-1">
        {[{l:'1h',h:1},{l:'4h',h:4},{l:'1d',h:24},{l:'1w',h:168}].map(q => (
          <button key={q.l} onClick={() => setQuick(q.h)} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted hover:bg-accent transition-colors font-medium">{q.l}</button>
        ))}
      </div>
      <div className="flex items-center gap-1 ml-auto">
        <Button size="sm" variant="outline" onClick={() => localDate && onSave(new Date(localDate).toISOString())} disabled={!localDate} className="h-7 px-2 text-xs rounded-lg gap-1"><Save className="h-3 w-3" /> Set</Button>
        {dueDate && (<Button size="sm" variant="ghost" onClick={onRemove} className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg gap-1"><CalendarX className="h-3 w-3" /> Remove</Button>)}
      </div>
    </div>
  );
}

// ─── JsonEditorDialog ────────────────────────────────────────────────────────

function JsonEditorDialog({ tasks, onSave, trigger }: { tasks: Task[]; onSave: (tasks: Task[]) => void; trigger: React.ReactNode }) {
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setJsonText(JSON.stringify(tasks.map(t => ({ text: t.text, details: t.details, completed: t.completed, dueDate: t.dueDate || undefined })), null, 2));
      setJsonError(null);
    }
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) { setJsonError('JSON must be an array.'); return; }
      const now = new Date().toISOString();
      const validated: Task[] = parsed.map((item: any, i: number) => {
        if (typeof item.text !== 'string' || !item.text.trim()) throw new Error(`Task ${i} needs "text".`);
        return { id: item.id || crypto.randomUUID(), text: item.text.trim(), details: item.details || '', completed: !!item.completed, createdAt: item.createdAt || now, updatedAt: now, dueDate: item.dueDate };
      });
      onSave(validated);
      setIsOpen(false);
    } catch (e: any) { setJsonError(e.message || 'Invalid JSON.'); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Braces className="h-5 w-5 text-primary" /> Edit Tasks as JSON</DialogTitle>
          <DialogDescription>Each task needs a <code className="bg-muted px-1 rounded text-xs">"text"</code> field. Paste a list to bulk-add.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(jsonText)} className="h-7 text-xs gap-1 rounded-lg"><Copy className="h-3 w-3" /> Copy</Button>
          <Button variant="outline" size="sm" onClick={async () => { setJsonText(await navigator.clipboard.readText()); setJsonError(null); }} className="h-7 text-xs gap-1 rounded-lg"><ClipboardPaste className="h-3 w-3" /> Paste</Button>
          <Button variant="outline" size="sm" onClick={() => { try { setJsonText(JSON.stringify(JSON.parse(jsonText), null, 2)); setJsonError(null); } catch (e: any) { setJsonError(e.message); } }} className="h-7 text-xs gap-1 rounded-lg"><Braces className="h-3 w-3" /> Format</Button>
          <span className="text-xs text-muted-foreground ml-auto">{(() => { try { const p = JSON.parse(jsonText); return Array.isArray(p) ? `${p.length} tasks` : ''; } catch { return ''; } })()}</span>
        </div>
        {jsonError && (<div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{jsonError}</span></div>)}
        <Textarea value={jsonText} onChange={e => { setJsonText(e.target.value); setJsonError(null); }} className={cn("font-mono text-sm min-h-[300px] max-h-[50vh] resize-none rounded-xl", jsonError && "border-destructive")} spellCheck={false} />
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild><Button variant="outline" className="rounded-xl">Cancel</Button></DialogClose>
          <Button onClick={handleSave} className="gap-1 rounded-xl"><Save className="h-4 w-4" /> Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── TaskDetails ─────────────────────────────────────────────────────────────

function TaskDetails({ task, onSave }: { task: Task; onSave: (details: string) => void }) {
  const [details, setDetails] = useState(task.details);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setDetails(task.details); }, [task.details]);

  const doSave = useCallback((val: string) => {
    setIsSaving(true);
    onSave(val);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setIsSaving(false), 1000);
  }, [onSave]);

  const handleChange = useCallback((val: string) => {
    setDetails(val);
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => doSave(val), 1000);
  }, [doSave]);

  useEffect(() => () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); if (autoSaveRef.current) clearTimeout(autoSaveRef.current); }, []);

  const hasContent = details.trim().length > 0;

  return (
    <div className="px-3 sm:px-4 pb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium text-muted-foreground">Details</Label>
          {hasContent && <span className="text-[10px] text-muted-foreground/60">{details.length} chars</span>}
        </div>
        <div className="flex items-center gap-2">
          {isSaving ? <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />Saving</span>
            : hasContent ? <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Saved</span> : null}
          <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} className={cn("h-6 px-2 text-[10px] rounded-lg", showPreview && "bg-muted")}><Eye className="h-3 w-3 mr-1" />Preview</Button>
        </div>
      </div>
      <div className={cn("grid gap-3", showPreview ? "md:grid-cols-2" : "grid-cols-1")}>
        <Textarea placeholder="Add notes using Markdown..." value={details} onChange={e => handleChange(e.target.value)} onBlur={() => doSave(details)} className="text-sm min-h-[120px] resize-none rounded-xl" rows={5} />
        {showPreview && (
          <div className="rounded-xl border bg-muted/30 min-h-[120px] p-3 overflow-auto">
            {hasContent ? (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                  a: ({...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                  input: ({...props}) => props.type === 'checkbox' ? <Checkbox checked={props.checked} disabled className="mr-1.5" /> : <input {...props} />,
                }}>{details}</ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground/40 text-xs"><Eye className="h-6 w-6 mx-auto mb-1 opacity-50" /></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AgendaList (Sidebar) ────────────────────────────────────────────────────

function DropdownMenuForAgenda({ onRename, onDelete, onArchive, onPin, disabled, isArchived, isPinned }: { onRename: () => void; onDelete: () => void; onArchive: () => void; onPin: () => void; disabled: boolean; isArchived: boolean; isPinned: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 ml-auto shrink-0" onClick={e => e.stopPropagation()}><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent className="rounded-xl">
        <DropdownMenuItem onSelect={onPin} className="text-blue-600 focus:text-blue-600 gap-2 text-xs">{isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}{isPinned ? 'Unpin' : 'Pin to top'}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onRename} className="gap-2 text-xs"><Edit className="h-3.5 w-3.5" /> Rename</DropdownMenuItem>
        <DropdownMenuItem onSelect={onArchive} className="text-amber-600 focus:text-amber-600 gap-2 text-xs"><Archive className="h-3.5 w-3.5" /> {isArchived ? 'Unarchive' : 'Archive'}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onDelete} disabled={disabled} className="text-destructive focus:text-destructive gap-2 text-xs"><Trash className="h-3.5 w-3.5" /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AgendaList({ agendaGroups, activeAgendaId, setActiveAgendaId, handleCreateAgenda, newAgendaName, setNewAgendaName, handleDeleteAgenda, handleRenameAgenda, handleArchiveAgenda, handlePinAgenda, handleReorderAgendas, editingAgendaId, setEditingAgendaId, editingAgendaName, setEditingAgendaName, onClose, isMobile, sidebarWidth, onResizeStart, isResizing, isCollapsed, onToggleCollapse }: {
  agendaGroups: AgendaGroup[]; activeAgendaId: string | null; setActiveAgendaId: (id: string) => void; handleCreateAgenda: () => void; newAgendaName: string; setNewAgendaName: (v: string) => void; handleDeleteAgenda: (id: string) => void; handleRenameAgenda: (id: string) => void; handleArchiveAgenda: (id: string) => void; handlePinAgenda: (id: string) => void; handleReorderAgendas: (a: string, b: string) => void; editingAgendaId: string | null; setEditingAgendaId: (v: string | null) => void; editingAgendaName: string; setEditingAgendaName: (v: string) => void; onClose?: () => void; isMobile?: boolean; sidebarWidth?: number; onResizeStart?: (e: React.MouseEvent) => void; isResizing?: boolean; isCollapsed?: boolean; onToggleCollapse?: () => void;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleSelect = (id: string) => { setActiveAgendaId(id); if (isMobile && onClose) onClose(); };

  const sorted = agendaGroups.filter(a => !a.archived).sort((a, b) => { if (a.pinned && !b.pinned) return -1; if (!a.pinned && b.pinned) return 1; return 0; });
  const archived = agendaGroups.filter(a => a.archived);

  // Collapsed view
  if (isCollapsed && !isMobile) {
    return (
      <aside className="flex flex-col border-r h-full bg-card w-[52px] transition-all duration-300">
        <div className="p-2 border-b flex flex-col items-center">
          <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="h-8 w-8" title="Expand"><PanelLeftOpen className="h-4 w-4" /></Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-1 flex flex-col items-center">
            {sorted.map(a => {
              const done = a.tasks.filter(t => t.completed).length;
              const all = a.tasks.length;
              const allDone = all > 0 && done === all;
              return (
                <Button key={a.id} variant={activeAgendaId === a.id ? "secondary" : "ghost"} size="icon" onClick={() => handleSelect(a.id)}
                  className={cn("h-9 w-9 relative", activeAgendaId === a.id && "ring-1 ring-primary/20")} title={`${a.name} (${done}/${all})`}>
                  <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors",
                    activeAgendaId === a.id ? "bg-primary text-primary-foreground" : "bg-muted", allDone && "bg-green-500/20 text-green-600")}>
                    {a.name.charAt(0).toUpperCase()}
                  </div>
                  {a.pinned && <Pin className="h-2.5 w-2.5 absolute -top-0.5 -right-0.5 text-blue-500" />}
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col border-r h-full bg-card relative transition-all duration-300" style={{ width: isMobile ? '280px' : (sidebarWidth ?? 280) }}>
      {!isMobile && onResizeStart && (
        <div className={cn("absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 hover:bg-primary/20 active:bg-primary/40 transition-colors", isResizing && "bg-primary/40")} onMouseDown={onResizeStart} />
      )}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Agendas</h2>
          </div>
          <div className="flex items-center gap-0.5">
            {!isMobile && onToggleCollapse && <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="h-7 w-7"><PanelLeftClose className="h-3.5 w-3.5" /></Button>}
            {isMobile && onClose && <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"><X className="h-4 w-4" /></Button>}
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" className="w-full h-8 text-xs rounded-lg gap-1.5 group"><Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" /> New Agenda</Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader><AlertDialogTitle>Create New Agenda</AlertDialogTitle><AlertDialogDescription>Enter a name for your new agenda.</AlertDialogDescription></AlertDialogHeader>
            <Input placeholder="e.g. Weekly Meeting" value={newAgendaName} onChange={e => setNewAgendaName(e.target.value)} className="rounded-xl" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateAgenda(); } }} />
            <AlertDialogFooter><AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleCreateAgenda} className="rounded-lg">Create</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">
          {sorted.map(agenda => {
            const count = agenda.tasks.length;
            const done = agenda.tasks.filter(t => t.completed).length;
            return (
              <div key={agenda.id} className={cn("relative group/item rounded-lg", draggedId === agenda.id && "opacity-50", dragOverId === agenda.id && "ring-2 ring-primary rounded-lg")}
                draggable={editingAgendaId !== agenda.id}
                onDragStart={e => { setDraggedId(agenda.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', agenda.id); }}
                onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                onDragOver={e => { e.preventDefault(); if (agenda.id !== draggedId) setDragOverId(agenda.id); }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={e => { e.preventDefault(); if (draggedId && draggedId !== agenda.id) handleReorderAgendas(draggedId, agenda.id); setDraggedId(null); setDragOverId(null); }}>
                {editingAgendaId === agenda.id ? (
                  <div className="flex items-center gap-1 p-1.5">
                    <Input value={editingAgendaName} onChange={e => setEditingAgendaName(e.target.value)} autoFocus className="h-7 text-sm rounded-lg"
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameAgenda(agenda.id); if (e.key === 'Escape') setEditingAgendaId(null); }}
                      onBlur={() => handleRenameAgenda(agenda.id)} />
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onMouseDown={() => handleRenameAgenda(agenda.id)}><Save className="h-3.5 w-3.5" /></Button>
                  </div>
                ) : (
                  <div role="button" tabIndex={0} onClick={() => handleSelect(agenda.id)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleSelect(agenda.id); }}
                    className={cn("w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all group cursor-pointer",
                      activeAgendaId === agenda.id ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/60")}>
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 cursor-grab active:cursor-grabbing shrink-0" />
                    <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-colors relative",
                      activeAgendaId === agenda.id ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      <FileText className="h-3.5 w-3.5" />
                      {agenda.pinned && <Pin className="h-2.5 w-2.5 absolute -top-1 -right-1 text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium block truncate">{agenda.name}</span>
                      {count > 0 && <span className="text-[10px] text-muted-foreground">{done}/{count}</span>}
                    </div>
                    <DropdownMenuForAgenda onRename={() => { setEditingAgendaId(agenda.id); setEditingAgendaName(agenda.name); }} onDelete={() => handleDeleteAgenda(agenda.id)} onArchive={() => handleArchiveAgenda(agenda.id)} onPin={() => handlePinAgenda(agenda.id)} disabled={agendaGroups.filter(a => !a.archived).length <= 1} isArchived={false} isPinned={agenda.pinned ?? false} />
                  </div>
                )}
              </div>
            );
          })}

          {archived.length > 0 && (
            <Collapsible className="mt-3 pt-3 border-t">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground h-8 text-xs group"><Archive className="h-3.5 w-3.5" /><span className="flex-1 text-left">Archived</span><span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md">{archived.length}</span><ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-90" /></Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-1">
                {archived.map(a => (
                  <button key={a.id} onClick={() => handleSelect(a.id)} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs opacity-60 hover:opacity-80 transition-all", activeAgendaId === a.id && "bg-primary/10")}>
                    <span className="flex-1 truncate">{a.name}</span>
                    <DropdownMenuForAgenda onRename={() => { setEditingAgendaId(a.id); setEditingAgendaName(a.name); }} onDelete={() => handleDeleteAgenda(a.id)} onArchive={() => handleArchiveAgenda(a.id)} onPin={() => handlePinAgenda(a.id)} disabled={false} isArchived={true} isPinned={a.pinned ?? false} />
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

// ─── Main Agenda Component ───────────────────────────────────────────────────

export function Agenda() {
  const { user } = useAuth();
  const [agendaGroups, setAgendaGroups] = useState<AgendaGroup[]>([]);
  const [activeAgendaId, setActiveAgendaId] = useState<string | null>(null);
  const firestoreLoadedRef = useRef(false);
  const lastSavedJsonRef = useRef<string>('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveDataRef = useRef<any>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const syncStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
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
  const [listExpandAll, setListExpandAll] = useState(false);
  const [listExpandedIds, setListExpandedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('manual');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showAbsoluteTime, setShowAbsoluteTime] = useState<Record<string, boolean>>({});

  // Drawing state
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#ef4444');
  const [drawingSize, setDrawingSize] = useState(3);
  const [showDrawingToolbar, setShowDrawingToolbar] = useState(false);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const drawingColors = [{ value: '#ef4444', label: 'Red' }, { value: '#f59e0b', label: 'Yellow' }, { value: '#22c55e', label: 'Green' }, { value: '#3b82f6', label: 'Blue' }, { value: '#a855f7', label: 'Purple' }, { value: '#ffffff', label: 'White' }, { value: '#000000', label: 'Black' }];

  // Sidebar
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const minSidebarWidth = 200;
  const maxSidebarWidth = 480;

  // Drag tasks
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // Drawing canvas helpers
  const clearDrawingCanvas = useCallback(() => { const c = drawingCanvasRef.current; if (c) { const ctx = c.getContext('2d'); if (ctx) ctx.clearRect(0, 0, c.width, c.height); } }, []);
  const resizeDrawingCanvas = useCallback(() => { const c = drawingCanvasRef.current; if (!c) return; const dpr = window.devicePixelRatio || 1; const r = c.getBoundingClientRect(); c.width = r.width * dpr; c.height = r.height * dpr; const ctx = c.getContext('2d'); if (ctx) ctx.scale(dpr, dpr); }, []);

  useEffect(() => { if (!isPresentationMode) return; const t = setTimeout(() => resizeDrawingCanvas(), 100); window.addEventListener('resize', resizeDrawingCanvas); return () => { clearTimeout(t); window.removeEventListener('resize', resizeDrawingCanvas); }; }, [isPresentationMode, resizeDrawingCanvas]);
  useEffect(() => { clearDrawingCanvas(); }, [presentationSlideIndex, presentationStyle, clearDrawingCanvas]);
  useEffect(() => { if (!isPresentationMode) { setIsDrawingMode(false); setShowDrawingToolbar(false); } }, [isPresentationMode]);

  const handleDrawStart = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return; setIsDrawing(true);
    const c = drawingCanvasRef.current; if (!c) return;
    const r = c.getBoundingClientRect();
    const [x, y] = 'touches' in e ? [e.touches[0].clientX - r.left, e.touches[0].clientY - r.top] : [e.clientX - r.left, e.clientY - r.top];
    lastPointRef.current = { x, y };
    const ctx = c.getContext('2d'); if (ctx) { ctx.beginPath(); ctx.arc(x, y, drawingSize / 2, 0, Math.PI * 2); ctx.fillStyle = drawingColor; ctx.fill(); }
  }, [isDrawingMode, drawingColor, drawingSize]);

  const handleDrawMove = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingMode) return;
    const c = drawingCanvasRef.current; if (!c) return;
    const r = c.getBoundingClientRect();
    let x: number, y: number;
    if ('touches' in e) { e.preventDefault(); x = e.touches[0].clientX - r.left; y = e.touches[0].clientY - r.top; }
    else { x = e.clientX - r.left; y = e.clientY - r.top; }
    const ctx = c.getContext('2d');
    if (ctx && lastPointRef.current) { ctx.beginPath(); ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y); ctx.lineTo(x, y); ctx.strokeStyle = drawingColor; ctx.lineWidth = drawingSize; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }
    lastPointRef.current = { x, y };
  }, [isDrawing, isDrawingMode, drawingColor, drawingSize]);

  const handleDrawEnd = useCallback(() => { setIsDrawing(false); lastPointRef.current = null; }, []);

  const playCompletionSound = useCallback(() => {
    if (localStorage.getItem(SOUND_ENABLED_KEY) === 'false') return;
    try { const ac = new (window.AudioContext || (window as any).webkitAudioContext)(); const o = ac.createOscillator(); const g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.setValueAtTime(400, ac.currentTime); o.type = 'sine'; g.gain.setValueAtTime(0, ac.currentTime); g.gain.linearRampToValueAtTime(0.15, ac.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15); o.start(ac.currentTime); o.stop(ac.currentTime + 0.15); } catch {}
  }, []);

  // Sidebar resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => { e.preventDefault(); setIsResizing(true); }, []);
  useEffect(() => {
    if (!isResizing) return;
    const move = (e: MouseEvent) => setSidebarWidth(Math.min(maxSidebarWidth, Math.max(minSidebarWidth, e.clientX)));
    const up = () => setIsResizing(false);
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
  }, [isResizing]);

  useEffect(() => { setIsClient(true); }, []);

  // Firestore load
  useEffect(() => {
    if (!isClient || !user) {
      if (isClient && !user) {
        firestoreLoadedRef.current = false;
        lastSavedJsonRef.current = '';
        const d = getDefaultAgendas();
        setAgendaGroups(d);
        setActiveAgendaId(d[0].id);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await loadUserData(user.uid);
        if (cancelled) return;

        let loadedAgendas: AgendaGroup[];
        let loadedActiveId: string | null;
        let loadedSidebarWidth = 280;
        let loadedSidebarCollapsed = false;

        if (data?.agendaGroups?.length) {
          const now = new Date().toISOString();
          loadedAgendas = data.agendaGroups.map(g => ({
            ...g,
            archived: g.archived ?? false,
            pinned: g.pinned ?? false,
            tasks: g.tasks.map((t: any) => ({
              ...t,
              details: t.details ?? '',
              createdAt: t.createdAt ?? now,
              updatedAt: t.updatedAt ?? now,
              dueDate: t.dueDate || undefined, // normalize null → undefined
            }))
          }));
          loadedActiveId = data.activeAgendaId && loadedAgendas.some(g => g.id === data.activeAgendaId)
            ? data.activeAgendaId : loadedAgendas[0].id;

          if (data.preferences) {
            if (data.preferences.sidebarCollapsed) loadedSidebarCollapsed = true;
            if (data.preferences.sidebarWidth >= minSidebarWidth && data.preferences.sidebarWidth <= maxSidebarWidth) {
              loadedSidebarWidth = data.preferences.sidebarWidth;
            }
          }
        } else {
          const d = getDefaultAgendas();
          loadedAgendas = d;
          loadedActiveId = d[0].id;
        }

        // Set all state
        setAgendaGroups(loadedAgendas);
        setActiveAgendaId(loadedActiveId);
        setSidebarWidth(loadedSidebarWidth);
        setIsSidebarCollapsed(loadedSidebarCollapsed);

        // Snapshot what we loaded so save effect can compare against it
        lastSavedJsonRef.current = JSON.stringify({
          agendaGroups: loadedAgendas,
          activeAgendaId: loadedActiveId,
          preferences: { sidebarWidth: loadedSidebarWidth, sidebarCollapsed: loadedSidebarCollapsed },
        });
        firestoreLoadedRef.current = true;
        console.log('[Firestore] Load complete — snapshot saved for change detection');
      } catch (err) {
        console.error('[Firestore] Load failed:', err);
        if (!cancelled) {
          const d = getDefaultAgendas();
          setAgendaGroups(d);
          setActiveAgendaId(d[0].id);
          lastSavedJsonRef.current = '';
          firestoreLoadedRef.current = true;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [isClient, user]);

  // Firestore save (debounced) — only when data actually changed from last save/load
  useEffect(() => {
    if (!isClient || !user || !firestoreLoadedRef.current || agendaGroups.length === 0) return;

    const currentData = {
      agendaGroups,
      activeAgendaId,
      preferences: { sidebarWidth, sidebarCollapsed: isSidebarCollapsed },
    };
    const currentJson = JSON.stringify(currentData);

    // Skip if data hasn't actually changed
    if (currentJson === lastSavedJsonRef.current) {
      return;
    }

    // Store pending data for beforeunload flush
    pendingSaveDataRef.current = currentData;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      setSyncStatus('saving');
      try {
        console.log('[Firestore] Saving data for user:', user.uid, 'agendas:', agendaGroups.length);
        await saveUserData(user.uid, currentData);
        console.log('[Firestore] Save successful');
        lastSavedJsonRef.current = currentJson;
        pendingSaveDataRef.current = null;
        setSyncStatus('saved');
        if (syncStatusTimerRef.current) clearTimeout(syncStatusTimerRef.current);
        syncStatusTimerRef.current = setTimeout(() => setSyncStatus('idle'), 2500);
      } catch (err: any) {
        console.error('[Firestore] Save failed:', err);
        setSyncStatus('error');
        toast({
          title: 'Failed to save',
          description: err?.message || 'Could not sync your data to the cloud. Check your connection.',
          variant: 'destructive',
        });
      }
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [agendaGroups, activeAgendaId, isClient, user, sidebarWidth, isSidebarCollapsed, toast]);

  // Flush pending saves when user leaves the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingSaveDataRef.current && user) {
        // Use sendBeacon-style sync save — navigator.sendBeacon can't call Firestore,
        // so we do a sync XHR-free approach: just let the last state persist via the
        // debounced save. Cancel the timer and do an immediate fire-and-forget save.
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        try {
          saveUserData(user.uid, pendingSaveDataRef.current);
          console.log('[Firestore] Flushing pending save on page unload');
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  const activeAgenda = useMemo(() => agendaGroups.find(a => a.id === activeAgendaId), [agendaGroups, activeAgendaId]);
  const hasTasksWithDetails = useMemo(() => activeAgenda?.tasks.some(t => t.details?.trim()) ?? false, [activeAgenda]);

  const enterPresentationMode = useCallback((style?: 'list' | 'slideshow') => {
    setPresentationSlideIndex(0); setSlideDirection('right');
    setPresentationStyle(style ?? (hasTasksWithDetails ? 'slideshow' : 'list'));
    setIsPresentationMode(true);
  }, [hasTasksWithDetails]);

  const goToSlide = useCallback((i: number, dir: 'left' | 'right') => { setSlideDirection(dir); setPresentationSlideIndex(i); }, []);

  // Keyboard nav for presentation
  useEffect(() => {
    if (!isPresentationMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setIsPresentationMode(false); }
      if (presentationStyle === 'slideshow' && activeAgenda) {
        const max = activeAgenda.tasks.length - 1;
        if (['ArrowRight', ' ', 'PageDown'].includes(e.key)) { e.preventDefault(); setPresentationSlideIndex(p => { setSlideDirection('right'); return Math.min(p + 1, max); }); }
        if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); setPresentationSlideIndex(p => { setSlideDirection('left'); return Math.max(p - 1, 0); }); }
        if (e.key === 'Home') { e.preventDefault(); setSlideDirection('left'); setPresentationSlideIndex(0); }
        if (e.key === 'End') { e.preventDefault(); setSlideDirection('right'); setPresentationSlideIndex(max); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPresentationMode, presentationStyle, activeAgenda]);

  // Task CRUD
  const updateTasks = (newTasks: Task[]) => { if (!activeAgendaId) return; setAgendaGroups(prev => prev.map(a => a.id === activeAgendaId ? { ...a, tasks: newTasks } : a)); };

  const handleAddTask = (e: FormEvent) => {
    e.preventDefault();
    if (newTaskText.trim() && activeAgenda) {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      updateTasks([...activeAgenda.tasks, { id, text: newTaskText.trim(), details: '', completed: false, createdAt: now, updatedAt: now }]);
      setNewTaskText(''); setExpandedTaskId(id);
    }
  };

  const handleToggleTask = (id: string) => {
    if (!activeAgenda) return;
    const task = activeAgenda.tasks.find(t => t.id === id);
    const completing = task && !task.completed;
    updateTasks(activeAgenda.tasks.map(t => t.id === id ? { ...t, completed: !t.completed, updatedAt: new Date().toISOString() } : t));
    if (completing) { playCompletionSound(); setRecentlyCompletedTaskId(id); setTimeout(() => setRecentlyCompletedTaskId(null), 600); }
  };

  const handleDeleteTask = (id: string) => { if (activeAgenda) updateTasks(activeAgenda.tasks.filter(t => t.id !== id)); };
  const handleStartEdit = (t: Task) => { setEditingTaskId(t.id); setEditingTaskText(t.text); };
  const handleSaveEdit = (id: string) => { if (editingTaskText.trim() && activeAgenda) updateTasks(activeAgenda.tasks.map(t => t.id === id ? { ...t, text: editingTaskText.trim(), updatedAt: new Date().toISOString() } : t)); setEditingTaskId(null); setEditingTaskText(''); };
  const handleCancelEdit = () => { setEditingTaskId(null); setEditingTaskText(''); };
  const handleSaveDetails = (id: string, d: string) => { if (activeAgenda) updateTasks(activeAgenda.tasks.map(t => t.id === id ? { ...t, details: d, updatedAt: new Date().toISOString() } : t)); };
  const handleSetDueDate = (id: string, d: string) => { if (activeAgenda) updateTasks(activeAgenda.tasks.map(t => t.id === id ? { ...t, dueDate: d, updatedAt: new Date().toISOString() } : t)); };
  const handleRemoveDueDate = (id: string) => { if (activeAgenda) updateTasks(activeAgenda.tasks.map(t => t.id === id ? { ...t, dueDate: undefined, updatedAt: new Date().toISOString() } : t)); };

  // Agenda CRUD
  const handleCreateAgenda = () => { if (newAgendaName.trim()) { const a: AgendaGroup = { id: crypto.randomUUID(), name: newAgendaName.trim(), tasks: [], archived: false }; setAgendaGroups(p => [...p, a]); setActiveAgendaId(a.id); setNewAgendaName(''); } };
  const handleDeleteAgenda = (id: string) => { setAgendaGroups(p => { const n = p.filter(a => a.id !== id); if (activeAgendaId === id) setActiveAgendaId(n[0]?.id ?? null); return n; }); };
  const handleRenameAgenda = (id: string) => { if (editingAgendaName.trim()) setAgendaGroups(p => p.map(a => a.id === id ? { ...a, name: editingAgendaName.trim() } : a)); setEditingAgendaId(null); setEditingAgendaName(''); };
  const handleArchiveAgenda = (id: string) => { setAgendaGroups(p => p.map(a => a.id === id ? { ...a, archived: !a.archived } : a)); };
  const handlePinAgenda = (id: string) => { setAgendaGroups(p => p.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a)); };
  const handleReorderAgendas = (dId: string, tId: string) => { setAgendaGroups(p => { const a = [...p]; const di = a.findIndex(x => x.id === dId); const ti = a.findIndex(x => x.id === tId); if (di === -1 || ti === -1) return p; const [d] = a.splice(di, 1); a.splice(ti, 0, d); return a; }); };

  // Task drag & drop
  const handleTaskDragStart = (e: React.DragEvent, id: string) => { setDraggedTaskId(id); e.dataTransfer.effectAllowed = 'move'; };
  const handleTaskDragEnd = () => { setDraggedTaskId(null); setDragOverTaskId(null); };
  const handleTaskDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!activeAgenda || !draggedTaskId || draggedTaskId === targetId) { setDraggedTaskId(null); setDragOverTaskId(null); return; }
    const tasks = [...activeAgenda.tasks]; const di = tasks.findIndex(t => t.id === draggedTaskId); const ti = tasks.findIndex(t => t.id === targetId);
    if (di !== -1 && ti !== -1) { const [d] = tasks.splice(di, 1); tasks.splice(ti, 0, d); updateTasks(tasks); }
    setDraggedTaskId(null); setDragOverTaskId(null);
  };

  const activeTasks = activeAgenda?.tasks || [];
  const sortedTasks = useMemo(() => {
    if (sortField === 'manual') return activeTasks;
    return [...activeTasks].sort((a, b) => {
      let av: number, bv: number;
      if (sortField === 'dueDate') { av = a.dueDate ? new Date(a.dueDate).getTime() : (sortOrder === 'asc' ? Infinity : -Infinity); bv = b.dueDate ? new Date(b.dueDate).getTime() : (sortOrder === 'asc' ? Infinity : -Infinity); }
      else { av = new Date(a[sortField]).getTime(); bv = new Date(b[sortField]).getTime(); }
      return sortOrder === 'asc' ? av - bv : bv - av;
    });
  }, [activeTasks, sortField, sortOrder]);

  const completedTasks = activeTasks.filter(t => t.completed).length;
  const totalTasks = activeTasks.length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  if (!isClient) {
    return (<div className="flex flex-1 overflow-hidden"><aside className="hidden md:flex shrink-0 w-[280px] border-r h-full bg-card" /><main className="flex-1" /></div>);
  }

  // ─── Presentation Mode ───────────────────────────────────────────────────

  const renderPresentation = () => {
    if (!isPresentationMode || !activeAgenda) return null;
    const tasks = sortedTasks;

    const getAnimClass = () => {
      const d = slideDirection;
      switch (presentationAnimation) {
        case 'stack': return d === 'right' ? 'animate-stack-enter-right' : 'animate-stack-enter-left';
        case 'flip': return d === 'right' ? 'animate-flip-enter-right' : 'animate-flip-enter-left';
        case 'slide': return d === 'right' ? 'animate-slide-enter-right' : 'animate-slide-enter-left';
        case 'fade': return 'animate-fade-enter';
        case 'zoom': return d === 'right' ? 'animate-zoom-enter-right' : 'animate-zoom-enter-left';
        default: return '';
      }
    };

    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-background via-background to-muted/30 flex flex-col animate-in fade-in duration-300">
        {/* Top controls */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1.5 z-10 flex-wrap justify-end">
          <div className="flex items-center rounded-xl border bg-background/80 backdrop-blur-sm overflow-hidden">
            <button onClick={() => { setPresentationStyle('list'); setPresentationSlideIndex(0); }} className={cn("flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium transition-colors", presentationStyle === 'list' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}><LayoutList className="h-3 w-3" /> <span className="hidden sm:inline">List</span></button>
            <button onClick={() => { setPresentationStyle('slideshow'); setPresentationSlideIndex(0); }} className={cn("flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium transition-colors", presentationStyle === 'slideshow' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}><GalleryHorizontalEnd className="h-3 w-3" /> <span className="hidden sm:inline">Cards</span></button>
          </div>
          <div className="hidden sm:flex items-center rounded-xl border bg-background/80 backdrop-blur-sm overflow-hidden">
            {[{ v: 'stack' as const, i: Layers }, { v: 'flip' as const, i: FlipVertical }, { v: 'slide' as const, i: SlidersHorizontal }, { v: 'fade' as const, i: Sparkles }, { v: 'zoom' as const, i: ZoomIn }].map(a => (
              <button key={a.v} onClick={() => setPresentationAnimation(a.v)} className={cn("flex items-center px-2 py-1.5 text-[11px] transition-colors", presentationAnimation === a.v ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}><a.i className="h-3 w-3" /></button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsPresentationMode(false)} className="h-7 w-7 p-0 rounded-xl bg-background/80 backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive"><X className="h-3.5 w-3.5" /></Button>
        </div>

        {/* Drawing */}
        <canvas ref={drawingCanvasRef} className={cn("absolute inset-0 w-full h-full z-[5]", isDrawingMode ? "cursor-crosshair" : "pointer-events-none")} onMouseDown={handleDrawStart} onMouseMove={handleDrawMove} onMouseUp={handleDrawEnd} onMouseLeave={handleDrawEnd} onTouchStart={handleDrawStart} onTouchMove={handleDrawMove} onTouchEnd={handleDrawEnd} />
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex items-center gap-1.5">
          <Button variant={isDrawingMode ? "default" : "outline"} size="sm" onClick={() => { setIsDrawingMode(!isDrawingMode); setShowDrawingToolbar(!isDrawingMode); }} className={cn("h-7 rounded-xl gap-1 text-[11px] bg-background/80 backdrop-blur-sm", isDrawingMode && "bg-primary text-primary-foreground")}><Pencil className="h-3 w-3" /><span className="hidden sm:inline">Draw</span></Button>
          {showDrawingToolbar && (
            <div className="flex items-center gap-1.5 rounded-xl border bg-background/90 backdrop-blur-sm px-2.5 py-1 animate-in fade-in slide-in-from-left-2 duration-200">
              {drawingColors.map(c => (<button key={c.value} onClick={() => setDrawingColor(c.value)} className={cn("h-5 w-5 rounded-full border-2 transition-transform hover:scale-110", drawingColor === c.value ? "border-primary scale-110 ring-2 ring-primary/30" : "border-transparent")} style={{ backgroundColor: c.value }} title={c.label} />))}
              <div className="w-px h-5 bg-border mx-0.5" />
              <button onClick={() => setDrawingSize(s => Math.max(1, s - 1))} className="h-5 w-5 rounded flex items-center justify-center hover:bg-muted"><Minus className="h-3 w-3" /></button>
              <div className="w-5 flex items-center justify-center"><div className="rounded-full" style={{ width: Math.max(3, Math.min(drawingSize, 16)), height: Math.max(3, Math.min(drawingSize, 16)), backgroundColor: drawingColor }} /></div>
              <button onClick={() => setDrawingSize(s => Math.min(20, s + 1))} className="h-5 w-5 rounded flex items-center justify-center hover:bg-muted"><Plus className="h-3 w-3" /></button>
              <div className="w-px h-5 bg-border mx-0.5" />
              <Button variant="ghost" size="sm" onClick={clearDrawingCanvas} className="h-6 px-1.5 text-[10px] gap-0.5 hover:bg-destructive/10 hover:text-destructive"><Eraser className="h-3 w-3" /></Button>
            </div>
          )}
        </div>

        {/* List mode */}
        {presentationStyle === 'list' && (
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8 md:p-12 overflow-auto" style={{ perspective: presentationAnimation === 'flip' ? '1200px' : undefined }}>
            <div className={cn("w-full max-w-4xl bg-card rounded-2xl shadow-2xl border flex flex-col overflow-hidden", `animate-list-${presentationAnimation}`)}>
              <div className="px-5 py-4 sm:px-8 sm:py-5 bg-gradient-to-r from-primary/5 to-transparent border-b">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"><Presentation className="h-4 w-4 text-primary" /></div>
                  <div className="flex-1 min-w-0"><h1 className="text-base sm:text-lg font-bold truncate">{activeAgenda.name}</h1></div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    {tasks.some(t => t.details) && (
                      <Button variant="ghost" size="sm" onClick={() => { if (listExpandAll) { setListExpandAll(false); setListExpandedIds(new Set()); } else { setListExpandAll(true); setListExpandedIds(new Set(tasks.map(t => t.id))); } }} className="gap-1 text-[11px] h-7 rounded-lg">
                        {listExpandAll ? <><ChevronsDownUp className="h-3 w-3" /> Collapse</> : <><ChevronsUpDown className="h-3 w-3" /> Expand</>}
                      </Button>
                    )}
                    <span>{completedTasks}/{tasks.length}</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-4 sm:p-8 overflow-auto max-h-[60vh]">
                {tasks.length > 0 ? (
                  <ul className="space-y-2.5">
                    {tasks.map((task, i) => {
                      const exp = listExpandedIds.has(task.id);
                      const hasDtl = !!task.details;
                      return (
                        <li key={task.id} className={cn("rounded-xl border transition-all", task.completed ? "bg-primary/5 border-primary/20 opacity-70" : "bg-muted/20 border-transparent hover:border-primary/10")}>
                          <div className="flex items-center gap-3 p-3 sm:p-4">
                            <button onClick={() => handleToggleTask(task.id)} className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-full shrink-0 flex items-center justify-center transition-all text-sm font-bold", task.completed ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20")}>
                              {task.completed ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <span>{i + 1}</span>}
                            </button>
                            <div className={cn("flex-1 min-w-0 flex items-center gap-2", hasDtl && "cursor-pointer")} onClick={() => { if (!hasDtl) return; setListExpandedIds(p => { const n = new Set(p); n.has(task.id) ? n.delete(task.id) : n.add(task.id); setListExpandAll(n.size === tasks.filter(t => t.details).length); return n; }); }}>
                              <span className={cn("text-sm sm:text-base md:text-lg font-medium flex-1", task.completed && "text-muted-foreground")}>{task.text}</span>
                              {hasDtl && <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform", exp && "rotate-180")} />}
                            </div>
                          </div>
                          {hasDtl && exp && (
                            <div className="px-4 pb-4 pl-14 sm:pl-16 text-muted-foreground prose prose-sm dark:prose-invert max-w-none animate-in fade-in slide-in-from-top-1 duration-200">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({...p}) => <a {...p} target="_blank" rel="noopener noreferrer" /> }}>{task.details}</ReactMarkdown>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-center py-12 text-muted-foreground"><p>No items in this agenda</p></div>
                )}
              </div>
              <div className="px-5 py-3 sm:px-8 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <span className="font-medium">{completedTasks === totalTasks && totalTasks > 0 ? <span className="text-primary flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> All done!</span> : `${completedTasks}/${totalTasks}`}</span>
              </div>
            </div>
          </div>
        )}

        {/* Slideshow mode */}
        {presentationStyle === 'slideshow' && tasks.length > 0 && (() => {
          const ci = presentationSlideIndex;
          const isFirst = ci === 0;
          const isLast = ci === tasks.length - 1;
          const visibleRange = presentationAnimation === 'stack' ? [-2, -1, 0, 1, 2] : [0];

          return (
            <>
              <button onClick={() => goToSlide(ci - 1, 'left')} disabled={isFirst} className={cn("absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-primary/10 transition-all", isFirst && "opacity-30 cursor-not-allowed")}><ChevronLeft className="h-5 w-5" /></button>
              <button onClick={() => goToSlide(ci + 1, 'right')} disabled={isLast} className={cn("absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-primary/10 transition-all", isLast && "opacity-30 cursor-not-allowed")}><ChevronRight className="h-5 w-5" /></button>
              <div className="flex-1 flex items-center justify-center px-12 sm:px-20 py-4 sm:py-10 overflow-hidden" style={{ perspective: '1200px' }}>
                <div className="relative w-full max-w-4xl" style={{ height: '70vh', maxHeight: '700px' }}>
                  {visibleRange.map(offset => {
                    const ti = ci + offset;
                    if (ti < 0 || ti >= tasks.length) return null;
                    const task = tasks[ti];
                    const ao = Math.abs(offset);
                    const ty = offset * -18; const sc = 1 - ao * 0.06; const zi = 10 - ao; const op = offset === 0 ? 1 : ao === 1 ? 0.55 : 0.25;
                    return (
                      <div key={task.id + '-' + offset} className={cn("absolute inset-0 rounded-2xl border bg-card flex flex-col overflow-hidden transition-all duration-500 ease-out", offset === 0 ? "shadow-2xl" : "shadow-lg pointer-events-none", offset === 0 ? getAnimClass() : '')}
                        style={presentationAnimation === 'stack' ? { transform: `translateY(${ty}px) scale(${sc}) rotateX(${offset * 1.5}deg)`, zIndex: zi, opacity: offset === 0 ? undefined : op, transformOrigin: 'center center' } : { transformOrigin: presentationAnimation === 'flip' ? (slideDirection === 'right' ? 'right center' : 'left center') : 'center center' }}>
                        {offset === 0 ? (
                          <>
                            <div className="px-5 py-4 sm:px-8 sm:py-5 bg-gradient-to-r from-primary/5 to-transparent border-b shrink-0">
                              <div className="flex items-center gap-3 sm:gap-4">
                                <button onClick={() => handleToggleTask(task.id)} className={cn("h-10 w-10 sm:h-12 sm:w-12 rounded-full shrink-0 flex items-center justify-center text-lg font-bold transition-all", task.completed ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20")}>
                                  {task.completed ? <CheckCircle2 className="h-6 w-6" /> : <span>{ci + 1}</span>}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <h2 className={cn("text-lg sm:text-2xl md:text-3xl font-bold leading-tight", task.completed && "line-through text-muted-foreground")}>{task.text}</h2>
                                  {task.dueDate && <div className="mt-1.5"><DueDateBadge dueDate={task.dueDate} showAbsolute={false} onClick={() => {}} completed={task.completed} /></div>}
                                </div>
                              </div>
                            </div>
                            <div className="flex-1 p-5 sm:p-8 overflow-auto">
                              {task.details ? (
                                <div className="prose prose-sm sm:prose-base md:prose-lg dark:prose-invert max-w-none">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({...p}) => <a {...p} target="_blank" rel="noopener noreferrer" className="text-primary" />, input: ({...p}) => p.type === 'checkbox' ? <Checkbox checked={p.checked} disabled className="mr-1.5" /> : <input {...p} /> }}>{task.details}</ReactMarkdown>
                                </div>
                              ) : (
                                <div className="h-full flex items-center justify-center"><div className="text-center text-muted-foreground/40"><NotepadText className="h-10 w-10 mx-auto mb-2 opacity-40" /><p className="text-sm">No details</p></div></div>
                              )}
                            </div>
                            <div className="px-5 py-3 sm:px-8 border-t bg-muted/20 flex items-center justify-between shrink-0">
                              <span className="text-xs text-muted-foreground">{activeAgenda.name}</span>
                              <div className="flex items-center gap-2">
                                <div className="hidden sm:flex items-center gap-1">
                                  {tasks.map((t, i) => (<button key={t.id} onClick={() => goToSlide(i, i > ci ? 'right' : 'left')} className={cn("h-1.5 rounded-full transition-all", i === ci ? "w-5 bg-primary" : t.completed ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted-foreground/30")} />))}
                                </div>
                                <span className="text-xs font-medium text-muted-foreground">{ci + 1}/{tasks.length}</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="px-5 py-4 sm:px-8 bg-gradient-to-r from-primary/5 to-transparent flex-1">
                            <div className="flex items-center gap-3">
                              <div className={cn("h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-sm font-bold", task.completed ? "bg-primary/30 text-primary-foreground/70" : "bg-primary/10 text-primary/60")}>{task.completed ? <CheckCircle2 className="h-4 w-4" /> : <span>{ti + 1}</span>}</div>
                              <span className={cn("text-base font-semibold truncate", task.completed && "line-through text-muted-foreground")}>{task.text}</span>
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
        {presentationStyle === 'slideshow' && tasks.length === 0 && (<div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">No items</p></div>)}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/40">{presentationStyle === 'slideshow' ? '← → or Space to navigate · ESC to exit' : 'ESC to exit'}</div>
      </div>
    );
  };

  // ─── Main Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {renderPresentation()}

      {/* Mobile overlay */}
      {isMobileSidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileSidebarOpen(false)} />}

      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0 h-full">
        <AgendaList agendaGroups={agendaGroups} activeAgendaId={activeAgendaId} setActiveAgendaId={setActiveAgendaId} handleCreateAgenda={handleCreateAgenda} newAgendaName={newAgendaName} setNewAgendaName={setNewAgendaName} handleDeleteAgenda={handleDeleteAgenda} handleRenameAgenda={handleRenameAgenda} handleArchiveAgenda={handleArchiveAgenda} handlePinAgenda={handlePinAgenda} handleReorderAgendas={handleReorderAgendas} editingAgendaId={editingAgendaId} setEditingAgendaId={setEditingAgendaId} editingAgendaName={editingAgendaName} setEditingAgendaName={setEditingAgendaName} sidebarWidth={sidebarWidth} onResizeStart={handleResizeStart} isResizing={isResizing} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(p => !p)} />
      </div>

      {/* Mobile sidebar */}
      <div className={cn("fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ease-in-out", isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full")}>
        <AgendaList agendaGroups={agendaGroups} activeAgendaId={activeAgendaId} setActiveAgendaId={setActiveAgendaId} handleCreateAgenda={handleCreateAgenda} newAgendaName={newAgendaName} setNewAgendaName={setNewAgendaName} handleDeleteAgenda={handleDeleteAgenda} handleRenameAgenda={handleRenameAgenda} handleArchiveAgenda={handleArchiveAgenda} handlePinAgenda={handlePinAgenda} handleReorderAgendas={handleReorderAgendas} editingAgendaId={editingAgendaId} setEditingAgendaId={setEditingAgendaId} editingAgendaName={editingAgendaName} setEditingAgendaName={setEditingAgendaName} onClose={() => setIsMobileSidebarOpen(false)} isMobile={true} />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-background">
        {/* Header bar */}
        <div className="border-b bg-card/60 backdrop-blur-sm sticky top-0 z-10 px-3 sm:px-4 md:px-6 py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 shrink-0" onClick={() => setIsMobileSidebarOpen(true)}><Menu className="h-4 w-4" /></Button>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate">{activeAgenda?.name || 'Select an Agenda'}</h2>
              {activeAgenda && totalTasks > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={progressPercent} className="h-1.5 flex-1 max-w-[200px] rounded-full" />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{completedTasks}/{totalTasks}</span>
                </div>
              )}
            </div>
            {activeAgenda && (
              <div className="flex items-center gap-1 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={sortField !== 'manual' ? 'default' : 'outline'} size="sm" className={cn("h-7 rounded-lg gap-1 text-[11px]", sortField !== 'manual' ? "bg-primary text-primary-foreground" : "")}><ArrowUpDown className="h-3 w-3" /><span className="hidden sm:inline">Sort</span></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl">
                    <DropdownMenuItem onClick={() => setSortField('manual')} className={cn("text-xs gap-2", sortField === 'manual' && 'bg-accent font-medium')}><GripVertical className="h-3.5 w-3.5" />Manual</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortField('dueDate'); setSortOrder(p => sortField === 'dueDate' ? (p === 'asc' ? 'desc' : 'asc') : 'asc'); }} className={cn("text-xs gap-2", sortField === 'dueDate' && 'bg-accent font-medium')}><CalendarClock className="h-3.5 w-3.5" />Due Date{sortField === 'dueDate' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 ml-auto" /> : <ArrowDown className="h-3 w-3 ml-auto" />)}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortField('createdAt'); setSortOrder(p => sortField === 'createdAt' ? (p === 'asc' ? 'desc' : 'asc') : 'asc'); }} className={cn("text-xs gap-2", sortField === 'createdAt' && 'bg-accent font-medium')}><Calendar className="h-3.5 w-3.5" />Created{sortField === 'createdAt' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 ml-auto" /> : <ArrowDown className="h-3 w-3 ml-auto" />)}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortField('updatedAt'); setSortOrder(p => sortField === 'updatedAt' ? (p === 'asc' ? 'desc' : 'asc') : 'asc'); }} className={cn("text-xs gap-2", sortField === 'updatedAt' && 'bg-accent font-medium')}><Clock className="h-3.5 w-3.5" />Updated{sortField === 'updatedAt' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 ml-auto" /> : <ArrowDown className="h-3 w-3 ml-auto" />)}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <JsonEditorDialog tasks={activeAgenda.tasks} onSave={newTasks => updateTasks(newTasks)} trigger={<Button variant="outline" size="sm" className="h-7 rounded-lg gap-1 text-[11px]"><Braces className="h-3 w-3" /><span className="hidden sm:inline">JSON</span></Button>} />
                <Button variant="outline" size="sm" onClick={() => enterPresentationMode()} className="h-7 rounded-lg gap-1 text-[11px]"><Presentation className="h-3 w-3" /><span className="hidden sm:inline">Present</span></Button>
              </div>
            )}
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 sm:p-4 md:p-6 pb-0">
            <form onSubmit={handleAddTask} className="flex gap-2">
              <Input value={newTaskText} onChange={e => setNewTaskText(e.target.value)} placeholder="Add a new task..." className="h-10 sm:h-11 rounded-xl text-sm sm:text-base shadow-sm border-2 border-transparent focus:border-primary/20" disabled={!activeAgenda} />
              <Button type="submit" size="lg" disabled={!activeAgenda || !newTaskText.trim()} className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl shadow-sm"><Plus className="h-4 w-4" /><span className="hidden sm:inline ml-1.5 text-sm">Add</span></Button>
            </form>
          </div>

          <ScrollArea className="flex-1 px-3 sm:px-4 md:px-6 py-3">
            <ul className="space-y-1.5 pb-4">
              {sortedTasks.map((task, index) => {
                const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
                const isUrgent = task.dueDate && !task.completed && !isOverdue && (new Date(task.dueDate).getTime() - Date.now()) < 4 * 3600000;
                return (
                  <li key={task.id} draggable onDragStart={e => handleTaskDragStart(e, task.id)} onDragEnd={handleTaskDragEnd}
                    onDragOver={e => { e.preventDefault(); if (task.id !== draggedTaskId) setDragOverTaskId(task.id); }} onDragLeave={() => setDragOverTaskId(null)} onDrop={e => handleTaskDrop(e, task.id)}
                    className={cn("group rounded-xl border bg-card transition-all duration-200 hover:shadow-sm",
                      task.completed && "opacity-50 bg-muted/30",
                      isOverdue && "border-l-[3px] border-l-red-500",
                      isUrgent && !isOverdue && "border-l-[3px] border-l-orange-500",
                      draggedTaskId === task.id && "opacity-40 scale-[0.98]",
                      dragOverTaskId === task.id && "ring-2 ring-primary ring-offset-1",
                      recentlyCompletedTaskId === task.id && "animate-task-complete")}>
                    <Collapsible open={expandedTaskId === task.id} onOpenChange={o => setExpandedTaskId(o ? task.id : null)}>
                      <div className="flex items-center gap-2 p-2.5 sm:p-3">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 cursor-grab active:cursor-grabbing shrink-0 hidden sm:block" />
                        <div className={cn("relative shrink-0", recentlyCompletedTaskId === task.id && "animate-checkbox-pop")}>
                          <Checkbox id={`t-${task.id}`} checked={task.completed} onCheckedChange={() => handleToggleTask(task.id)}
                            className={cn("h-5 w-5 rounded-full transition-all", task.completed && "bg-green-500 border-green-500")} />
                          {task.completed && <CheckCircle2 className={cn("absolute inset-0 h-5 w-5 text-green-500 pointer-events-none", recentlyCompletedTaskId === task.id && "animate-checkmark")} />}
                          {recentlyCompletedTaskId === task.id && (<>
                            <span className="absolute inset-0 animate-ping-once rounded-full bg-green-400/50" />
                            <span className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-green-400 rounded-full animate-particle-1" />
                            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-particle-2" />
                            <span className="absolute -bottom-1 -left-1 w-1 h-1 bg-teal-400 rounded-full animate-particle-3" />
                            <span className="absolute -bottom-1 -right-1 w-1 h-1 bg-green-300 rounded-full animate-particle-4" />
                          </>)}
                        </div>
                        {editingTaskId === task.id ? (
                          <Input value={editingTaskText} onChange={e => setEditingTaskText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(task.id); } if (e.key === 'Escape') handleCancelEdit(); }} onBlur={() => handleSaveEdit(task.id)} autoFocus className="flex-1 h-8 text-sm rounded-lg" />
                        ) : (
                          <div className="flex-1 min-w-0">
                            <span className={cn("text-sm sm:text-base font-medium transition-colors cursor-text break-words block leading-snug", task.completed ? "line-through text-muted-foreground" : "text-foreground")} onDoubleClick={() => handleStartEdit(task)}>{task.text}</span>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {task.dueDate && <DueDateBadge dueDate={task.dueDate} showAbsolute={showAbsoluteTime[task.id] ?? false} onClick={() => setShowAbsoluteTime(p => ({ ...p, [task.id]: !p[task.id] }))} completed={task.completed} />}
                              {task.details && <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5"><NotepadText className="h-2.5 w-2.5" />notes</span>}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-0.5 ml-auto shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"><NotepadText className={cn("h-3.5 w-3.5", task.details ? "text-primary" : "text-muted-foreground")} /></Button>
                          </CollapsibleTrigger>
                          {editingTaskId === task.id ? (
                            <Button variant="ghost" size="icon" onMouseDown={e => { e.preventDefault(); handleSaveEdit(task.id); }} className="h-7 w-7 rounded-lg"><Save className="h-3.5 w-3.5 text-green-600" /></Button>
                          ) : (
                            <Button variant="ghost" size="icon" onClick={() => handleStartEdit(task)} className="h-7 w-7 rounded-lg"><Edit className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)} className="h-7 w-7 rounded-lg hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></Button>
                        </div>
                      </div>
                      <CollapsibleContent>
                        <div className="px-3 sm:px-4 pt-2 pb-3 border-t border-dashed space-y-2">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />Created: {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />Updated: {new Date(task.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CalendarClock className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-[10px] text-muted-foreground">Due:</span>
                            <DueDateEditor dueDate={task.dueDate} onSave={d => handleSetDueDate(task.id, d)} onRemove={() => handleRemoveDueDate(task.id)} />
                          </div>
                        </div>
                        <TaskDetails task={task} onSave={d => handleSaveDetails(task.id, d)} />
                      </CollapsibleContent>
                    </Collapsible>
                  </li>
                );
              })}
              {totalTasks === 0 && activeAgenda && (
                <div className="text-center py-16 flex flex-col items-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4"><Sparkles className="h-8 w-8 text-muted-foreground/30" /></div>
                  <p className="text-base font-semibold mb-1">Ready to start?</p>
                  <p className="text-sm text-muted-foreground max-w-xs">Add your first task above to begin.</p>
                </div>
              )}
              {!activeAgenda && isClient && (
                <div className="text-center py-16 flex flex-col items-center">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><ListTodo className="h-8 w-8 text-primary/40" /></div>
                  <p className="text-base font-semibold mb-1">Welcome to Task Buddy</p>
                  <p className="text-sm text-muted-foreground max-w-xs">Select or create an agenda to get started.</p>
                </div>
              )}
            </ul>
          </ScrollArea>

          {/* Footer stats + sync status */}
          <div className="border-t bg-card/60 backdrop-blur-sm px-4 py-2 flex items-center justify-between">
            {/* Left: task stats */}
            <div className="flex-1">
              {activeAgenda && totalTasks > 0 && (
                completedTasks === totalTasks ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium"><CheckCircle2 className="h-4 w-4" /><span>All done!</span><span>🎉</span></div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="text-lg font-bold text-primary">{completedTasks}</span><span>/</span><span className="text-base font-medium">{totalTasks}</span><span>completed</span></div>
                )
              )}
            </div>
            {/* Right: sync status indicator */}
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
              {syncStatus === 'saving' && (
                <span className="flex items-center gap-1 animate-in fade-in duration-200">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span>Saving...</span>
                </span>
              )}
              {syncStatus === 'saved' && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 animate-in fade-in duration-200">
                  <Cloud className="h-3 w-3" />
                  <span>Synced</span>
                </span>
              )}
              {syncStatus === 'error' && (
                <span className="flex items-center gap-1 text-destructive animate-in fade-in duration-200">
                  <CloudOff className="h-3 w-3" />
                  <span>Sync failed</span>
                </span>
              )}
              {syncStatus === 'idle' && user && (
                <span className="flex items-center gap-1 opacity-50">
                  <Cloud className="h-3 w-3" />
                </span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
