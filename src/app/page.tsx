import { Agenda } from '@/components/Agenda';
import { Header } from '@/components/Header';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function Home() {
  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <SidebarProvider>
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Agenda />
        </div>
      </SidebarProvider>
    </div>
  );
}
