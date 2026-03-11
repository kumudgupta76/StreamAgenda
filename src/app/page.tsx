import { Agenda } from '@/components/Agenda';
import { Header } from '@/components/Header';

export default function Home() {
  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <Header />
      <Agenda />
    </div>
  );
}
