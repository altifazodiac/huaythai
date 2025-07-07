import { AuthProvider } from "@/lib/contexts/AuthContext";
import AppLayoutClient from "@/components/AppLayoutClient";
import { AppBottomNav } from "@/components/app-bottom-nav";
import UserHeader from "@/components/UserHeader";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppLayoutClient>
        <UserHeader />
        <main className="flex-1">
          {children}
        </main>
        <AppBottomNav />
      </AppLayoutClient>
    </AuthProvider>
  );
}
