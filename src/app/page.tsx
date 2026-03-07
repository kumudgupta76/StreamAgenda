'use client';

import { Agenda } from '@/components/Agenda';
import { Header } from '@/components/Header';
import { AuthPage } from '@/components/AuthPage';
import { useAuth } from '@/components/providers/auth-provider';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <Header />
      <Agenda />
    </div>
  );
}
