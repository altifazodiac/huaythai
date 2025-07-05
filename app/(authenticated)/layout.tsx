import { AppBottomNav } from "@/components/app-bottom-nav";
import UserHeader from "@/components/UserHeader";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <UserHeader />
      <main className="flex-1">
        {children}
      </main>
      <AppBottomNav />
    </>
  );
}
