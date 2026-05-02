"use client"

import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
    Pencil,
    X,
    Eraser,
    Minus,
    Plus,
    Download,
    Trash2,
    Bold,
    Italic,
    List,
    ListChecks,
    Heading,
    Save,
    PenLine,
    MousePointer2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NOTES_STORAGE_KEY = "whiteboard-notes-html"

const DRAWING_COLORS = [
    { value: "#ef4444", label: "Red" },
    { value: "#f59e0b", label: "Yellow" },
    { value: "#22c55e", label: "Green" },
    { value: "#3b82f6", label: "Blue" },
    { value: "#a855f7", label: "Purple" },
    { value: "#ffffff", label: "White" },
    { value: "#000000", label: "Black" },
]

interface WhiteboardProps {
    open: boolean
    onClose: () => void
}

export function Whiteboard({ open, onClose }: WhiteboardProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const lastPointRef = useRef<{ x: number; y: number } | null>(null)
    const hasLoadedRef = useRef(false)

    // Drawing state
    const [drawMode, setDrawMode] = useState(false)
    const [drawingColor, setDrawingColor] = useState("#3b82f6")
    const [drawingSize, setDrawingSize] = useState(3)
    const [isErasing, setIsErasing] = useState(false)
    const [isDrawing, setIsDrawing] = useState(false)

    // Editor active-format state (which inline/block tools apply to current selection)
    const [activeFormats, setActiveFormats] = useState({
        bold: false,
        italic: false,
        ul: false,
        heading: false, // true when current block is H2
    })

    const updateActiveFormats = useCallback(() => {
        if (!editorRef.current) return
        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0) return
        const anchor = sel.anchorNode
        if (!anchor || !editorRef.current.contains(anchor)) return
        let block = ""
        try {
            const v = document.queryCommandValue("formatBlock") || ""
            block = v.toString().toUpperCase().replace(/[<>]/g, "")
        } catch {
            // ignore
        }
        try {
            setActiveFormats({
                bold: document.queryCommandState("bold"),
                italic: document.queryCommandState("italic"),
                ul: document.queryCommandState("insertUnorderedList"),
                heading: block === "H2",
            })
        } catch {
            // ignore
        }
    }, [])

    useEffect(() => {
        if (!open) return
        const handler = () => updateActiveFormats()
        document.addEventListener("selectionchange", handler)
        return () => document.removeEventListener("selectionchange", handler)
    }, [open, updateActiveFormats])

    // ===== Editor: load saved content on open =====
    useEffect(() => {
        if (!open) {
            hasLoadedRef.current = false
            return
        }
        const t = setTimeout(() => {
            if (!editorRef.current || hasLoadedRef.current) return
            try {
                const saved = localStorage.getItem(NOTES_STORAGE_KEY)
                editorRef.current.innerHTML = saved ?? ""
            } catch {
                // ignore
            }
            hasLoadedRef.current = true
        }, 0)
        return () => clearTimeout(t)
    }, [open])

    const persistEditor = useCallback(() => {
        if (!editorRef.current) return
        try {
            localStorage.setItem(NOTES_STORAGE_KEY, editorRef.current.innerHTML)
        } catch {
            // ignore
        }
    }, [])

    // ===== Editor: formatting actions =====
    const exec = useCallback(
        (command: string, value?: string) => {
            editorRef.current?.focus()
            // execCommand is deprecated but still works in all major browsers; sufficient for a local note tool.
            document.execCommand(command, false, value)
            persistEditor()
            updateActiveFormats()
        },
        [persistEditor, updateActiveFormats]
    )

    const formatBlock = (tag: string) => exec("formatBlock", tag)

    // Toggle a single heading level (H2). If already H2, revert to paragraph.
    const toggleHeading = useCallback(() => {
        editorRef.current?.focus()
        let block = ""
        try {
            block = (document.queryCommandValue("formatBlock") || "").toString().toUpperCase()
        } catch {
            // ignore
        }
        formatBlock(block === "H2" ? "P" : "H2")
    }, [])

    const insertChecklist = useCallback(() => {
        editorRef.current?.focus()
        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0) return
        const range = sel.getRangeAt(0)
        const wrapper = document.createElement("div")
        wrapper.className = "wb-check-item"
        wrapper.innerHTML = `<input type="checkbox" class="wb-check" /> <span>Checklist item</span>`
        range.deleteContents()
        range.insertNode(wrapper)
        const span = wrapper.querySelector("span")
        if (span) {
            const r = document.createRange()
            r.selectNodeContents(span)
            r.collapse(false)
            sel.removeAllRanges()
            sel.addRange(r)
        }
        const after = document.createElement("div")
        after.innerHTML = "<br/>"
        wrapper.parentNode?.insertBefore(after, wrapper.nextSibling)
        persistEditor()
    }, [persistEditor])

    // Persist checkbox toggles
    useEffect(() => {
        if (!open) return
        const root = editorRef.current
        if (!root) return
        const handler = (e: Event) => {
            const t = e.target as HTMLElement
            if (t instanceof HTMLInputElement && t.type === "checkbox" && t.classList.contains("wb-check")) {
                if (t.checked) t.setAttribute("checked", "checked")
                else t.removeAttribute("checked")
                persistEditor()
            }
        }
        root.addEventListener("change", handler)
        return () => root.removeEventListener("change", handler)
    }, [open, persistEditor])

    const downloadNotes = () => {
        if (!editorRef.current) return
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Whiteboard Notes</title>
<style>body{font-family:sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6}
h1{font-size:1.875rem}h2{font-size:1.5rem}h3{font-size:1.25rem}
ul,ol{padding-left:1.5rem}
.wb-check-item{display:flex;align-items:center;gap:.5rem;margin:.25rem 0}
</style></head><body>${editorRef.current.innerHTML}</body></html>`
        const blob = new Blob([html], { type: "text/html" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.download = `notes-${new Date().toISOString().slice(0, 10)}.html`
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
    }

    // ===== Drawing canvas =====
    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        const prev = ctx ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null
        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        const newCtx = canvas.getContext("2d")
        if (newCtx) {
            newCtx.scale(dpr, dpr)
            if (prev) {
                try {
                    newCtx.putImageData(prev, 0, 0)
                } catch {
                    // ignore
                }
            }
        }
    }, [])

    useEffect(() => {
        if (!open) return
        const t = setTimeout(() => resizeCanvas(), 50)
        window.addEventListener("resize", resizeCanvas)
        return () => {
            clearTimeout(t)
            window.removeEventListener("resize", resizeCanvas)
        }
    }, [open, resizeCanvas])

    const getPos = (
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }
        const rect = canvas.getBoundingClientRect()
        if ("touches" in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            }
        }
        return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const handleStart = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
            if (!drawMode) return
            setIsDrawing(true)
            const { x, y } = getPos(e)
            lastPointRef.current = { x, y }
            const canvas = canvasRef.current
            const ctx = canvas?.getContext("2d")
            if (!ctx) return
            if (isErasing) {
                ctx.save()
                ctx.globalCompositeOperation = "destination-out"
                ctx.beginPath()
                ctx.arc(x, y, drawingSize * 2, 0, Math.PI * 2)
                ctx.fill()
                ctx.restore()
            } else {
                ctx.beginPath()
                ctx.arc(x, y, drawingSize / 2, 0, Math.PI * 2)
                ctx.fillStyle = drawingColor
                ctx.fill()
            }
        },
        [drawMode, drawingColor, drawingSize, isErasing]
    )

    const handleMove = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
            if (!isDrawing || !drawMode) return
            if ("touches" in e) e.preventDefault()
            const { x, y } = getPos(e)
            const canvas = canvasRef.current
            const ctx = canvas?.getContext("2d")
            if (!ctx || !lastPointRef.current) return
            ctx.save()
            if (isErasing) {
                ctx.globalCompositeOperation = "destination-out"
                ctx.lineWidth = drawingSize * 4
            } else {
                ctx.strokeStyle = drawingColor
                ctx.lineWidth = drawingSize
            }
            ctx.lineCap = "round"
            ctx.lineJoin = "round"
            ctx.beginPath()
            ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
            ctx.lineTo(x, y)
            ctx.stroke()
            ctx.restore()
            lastPointRef.current = { x, y }
        },
        [isDrawing, drawMode, isErasing, drawingColor, drawingSize]
    )

    const handleEnd = useCallback(() => {
        setIsDrawing(false)
        lastPointRef.current = null
    }, [])

    const clearCanvas = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    const clearAll = useCallback(() => {
        const ok = window.confirm("Clear all notes and drawings? This cannot be undone.")
        if (!ok) return
        if (editorRef.current) {
            editorRef.current.innerHTML = ""
            persistEditor()
        }
        clearCanvas()
    }, [persistEditor])

    const downloadCanvas = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const link = document.createElement("a")
        link.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`
        link.href = canvas.toDataURL("image/png")
        link.click()
    }

    // Close on Escape
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open, onClose])

    if (!open) return null

    const ToolbarBtn = ({
        onClick,
        title,
        active,
        children,
    }: {
        onClick: () => void
        title: string
        active?: boolean
        children: React.ReactNode
    }) => (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()} // keep editor selection
            onClick={onClick}
            title={title}
            aria-pressed={!!active}
            className={cn(
                "h-8 w-8 rounded flex items-center justify-center transition-colors",
                active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-muted text-foreground"
            )}
        >
            {children}
        </button>
    )

    return (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col animate-in fade-in duration-200">
            {/* ===== Primary header ===== */}
            <header className="flex items-center gap-3 border-b bg-card/50 backdrop-blur-sm px-4 py-2.5 shrink-0">
                {/* Brand */}
                <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Pencil className="h-4 w-4 text-primary" />
                    </div>
                    <div className="hidden sm:block min-w-0">
                        <h2 className="font-semibold text-sm leading-tight truncate">Whiteboard</h2>
                        <p className="text-[11px] text-muted-foreground leading-tight">Notes & sketches</p>
                    </div>
                </div>

                <div className="flex-1" />

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={downloadNotes}
                        className="h-9 gap-1.5 hidden md:inline-flex"
                        title="Export notes as HTML"
                    >
                        <Save className="h-4 w-4" />
                        <span className="text-xs">Export notes</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={downloadCanvas}
                        className="h-9 gap-1.5 hidden md:inline-flex"
                        title="Export drawing as PNG"
                    >
                        <Download className="h-4 w-4" />
                        <span className="text-xs">Export PNG</span>
                    </Button>

                    {/* Compact icon-only export buttons on small screens */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={downloadNotes}
                        className="h-9 w-9 md:hidden"
                        title="Export notes (.html)"
                        aria-label="Export notes"
                    >
                        <Save className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={downloadCanvas}
                        className="h-9 w-9 md:hidden"
                        title="Export drawing (.png)"
                        aria-label="Export drawing"
                    >
                        <Download className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-6 bg-border mx-1" />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAll}
                        className="h-9 gap-1.5 hover:bg-destructive/10 hover:text-destructive"
                        title="Clear all notes and drawings"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="text-xs hidden md:inline">Clear all</span>
                    </Button>

                    <div className="w-px h-6 bg-border mx-1" />

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                        title="Close (Esc)"
                        aria-label="Close whiteboard"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </header>

            {/* ===== Unified toolbar: Editor + Drawing always visible ===== */}
            <div className="border-b bg-background/60 backdrop-blur-sm px-4 py-2 shrink-0 overflow-x-auto">
                <div className="flex items-center gap-3 min-w-max">
                    {/* ---- Editor section ---- */}
                    <button
                        type="button"
                        onClick={() => setDrawMode(false)}
                        className={cn(
                            "flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-colors shrink-0",
                            !drawMode
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                        title="Switch to Type mode"
                        aria-pressed={!drawMode}
                    >
                        <MousePointer2 className="h-3.5 w-3.5" />
                        <span>Type</span>
                    </button>

                    <div
                        className={cn(
                            "flex items-center gap-0.5 rounded-lg border px-1.5 py-1 transition-all",
                            !drawMode ? "border-primary/30 bg-primary/[0.03]" : "border-border opacity-70"
                        )}
                        onMouseDownCapture={() => {
                            if (drawMode) setDrawMode(false)
                        }}
                    >
                        <ToolbarBtn onClick={toggleHeading} title="Heading" active={activeFormats.heading}>
                            <Heading className="h-4 w-4" />
                        </ToolbarBtn>
                        <ToolbarBtn onClick={() => exec("bold")} title="Bold (Ctrl+B)" active={activeFormats.bold}>
                            <Bold className="h-4 w-4" />
                        </ToolbarBtn>
                        <ToolbarBtn onClick={() => exec("italic")} title="Italic (Ctrl+I)" active={activeFormats.italic}>
                            <Italic className="h-4 w-4" />
                        </ToolbarBtn>
                        <ToolbarBtn onClick={() => exec("insertUnorderedList")} title="Bullet list" active={activeFormats.ul}>
                            <List className="h-4 w-4" />
                        </ToolbarBtn>
                        <ToolbarBtn onClick={insertChecklist} title="Checklist">
                            <ListChecks className="h-4 w-4" />
                        </ToolbarBtn>
                    </div>

                    {/* ---- Draw section ---- */}
                    <button
                        type="button"
                        onClick={() => setDrawMode(true)}
                        className={cn(
                            "flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-colors shrink-0",
                            drawMode
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                        title="Switch to Draw mode"
                        aria-pressed={drawMode}
                    >
                        <PenLine className="h-3.5 w-3.5" />
                        <span>Draw</span>
                    </button>

                    <div
                        className={cn(
                            "flex items-center gap-2 rounded-lg border px-2 py-1 transition-all",
                            drawMode ? "border-primary/30 bg-primary/[0.03]" : "border-border opacity-70"
                        )}
                        onMouseDownCapture={() => {
                            if (!drawMode) setDrawMode(true)
                        }}
                    >
                        {/* Colors */}
                        <div className="flex items-center gap-1">
                            {DRAWING_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    onClick={() => {
                                        setDrawingColor(color.value)
                                        setIsErasing(false)
                                    }}
                                    className={cn(
                                        "h-5 w-5 rounded-full border-2 transition-transform hover:scale-110",
                                        drawingColor === color.value && !isErasing
                                            ? "border-primary scale-110 ring-2 ring-primary/30"
                                            : "border-muted-foreground/30"
                                    )}
                                    style={{ backgroundColor: color.value }}
                                    title={color.label}
                                    aria-label={color.label}
                                />
                            ))}
                        </div>

                        <div className="w-px h-5 bg-border" />

                        {/* Size */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setDrawingSize((s) => Math.max(1, s - 1))}
                                className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                title="Decrease size"
                                aria-label="Decrease size"
                            >
                                <Minus className="h-3 w-3" />
                            </button>
                            <div className="flex items-center justify-center w-6 h-6">
                                <div
                                    className="rounded-full transition-all"
                                    style={{
                                        width: Math.max(4, Math.min(drawingSize, 20)),
                                        height: Math.max(4, Math.min(drawingSize, 20)),
                                        backgroundColor: isErasing ? "#94a3b8" : drawingColor,
                                    }}
                                />
                            </div>
                            <button
                                onClick={() => setDrawingSize((s) => Math.min(20, s + 1))}
                                className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                title="Increase size"
                                aria-label="Increase size"
                            >
                                <Plus className="h-3 w-3" />
                            </button>
                            <span className="text-[11px] tabular-nums text-muted-foreground w-5 text-right">
                                {drawingSize}
                            </span>
                        </div>

                        <div className="w-px h-5 bg-border" />

                        {/* Eraser & Clear */}
                        <button
                            type="button"
                            onClick={() => setIsErasing((v) => !v)}
                            className={cn(
                                "flex items-center gap-1 h-7 px-2 rounded text-xs font-medium transition-colors",
                                isErasing
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted text-foreground"
                            )}
                            title={isErasing ? "Eraser active" : "Eraser"}
                            aria-pressed={isErasing}
                        >
                            <Eraser className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">Eraser</span>
                        </button>
                        <button
                            type="button"
                            onClick={clearCanvas}
                            className="flex items-center gap-1 h-7 px-2 rounded text-xs font-medium transition-colors hover:bg-destructive/10 hover:text-destructive text-foreground"
                            title="Clear all drawings"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">Clear</span>
                        </button>
                    </div>

                    <div className="flex-1" />

                    <span className="text-[11px] text-muted-foreground italic hidden lg:inline shrink-0">
                        {drawMode
                            ? "Sketching over your notes"
                            : "Editing text"}
                    </span>
                </div>
            </div>

            {/* Body — editor with drawing canvas overlay */}
            <div className="flex-1 relative overflow-hidden">
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={persistEditor}
                    onBlur={persistEditor}
                    spellCheck
                    data-placeholder="Start typing your notes... Use the toolbar for headings, lists, checkboxes, and more."
                    className={cn(
                        "wb-editor absolute inset-0 overflow-auto p-6 md:p-10 outline-none",
                        "max-w-none text-foreground",
                        "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-4",
                        "[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-4",
                        "[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3",
                        "[&_p]:my-2 [&_p]:leading-relaxed",
                        "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2",
                        "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2",
                        "[&_li]:my-1",
                        "[&_.wb-check-item]:flex [&_.wb-check-item]:items-center [&_.wb-check-item]:gap-2 [&_.wb-check-item]:my-1",
                        "[&_.wb-check]:h-4 [&_.wb-check]:w-4 [&_.wb-check]:accent-primary"
                    )}
                />
                <canvas
                    ref={canvasRef}
                    className={cn(
                        "absolute inset-0 w-full h-full touch-none",
                        drawMode
                            ? isErasing
                                ? "cursor-cell"
                                : "cursor-crosshair"
                            : "pointer-events-none"
                    )}
                    onMouseDown={handleStart}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={handleStart}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                />
            </div>

            <style jsx global>{`
                .wb-editor:empty:before {
                    content: attr(data-placeholder);
                    color: hsl(var(--muted-foreground));
                    pointer-events: none;
                    font-style: italic;
                }
            `}</style>
        </div>
    )
}
