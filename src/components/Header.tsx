"use client"

import { Presentation } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';

export function Header() {
  return (
    <header className="flex h-16 w-full shrink-0 items-center border-b px-4 md:px-6">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-3">
          <Presentation className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold font-headline tracking-tight">Task Buddy</h1>
        </div>
        <ThemeSwitcher />
      </div>
    </header>
  );
}
