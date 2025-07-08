import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppBottomNav } from '@/components/app-bottom-nav';
import UserHeader from '@/components/UserHeader';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // If user is not logged in, redirect to login
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      
      <main className="flex-1 p-4 pb-20 overflow-y-auto">
        {children}
      </main>
      <AppBottomNav />
    </div>
  );
}
