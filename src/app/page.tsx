import { Agenda } from '@/components/Agenda';
import { Header } from '@/components/Header';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <Agenda />
      </main>
    </div>
  );
}
