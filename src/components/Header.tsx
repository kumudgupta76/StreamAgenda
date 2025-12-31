import { Presentation } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto flex h-16 items-center gap-3 px-4 md:px-6">
        <Presentation className="h-7 w-7" />
        <h1 className="text-2xl font-bold font-headline tracking-tight">StreamAgenda</h1>
      </div>
    </header>
  );
}
