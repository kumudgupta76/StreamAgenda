"use client"

import { useState } from 'react';
import { Presentation, Pencil } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { SoundToggle } from '@/components/sound-toggle';
import { Button } from '@/components/ui/button';
import { Whiteboard } from '@/components/Whiteboard';

export function Header() {
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);

  return (
    <header className="flex h-16 w-full shrink-0 items-center border-b px-4 md:px-6">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-3">
          <Presentation className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold font-headline tracking-tight">Task Buddy</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWhiteboardOpen(true)}
            title="Open whiteboard"
            aria-label="Open whiteboard"
          >
            <Pencil className="h-5 w-5" />
          </Button>
          <SoundToggle />
          <ThemeSwitcher />
        </div>
      </div>
      <Whiteboard open={whiteboardOpen} onClose={() => setWhiteboardOpen(false)} />
    </header>
  );
}
