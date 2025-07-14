import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { Kanit } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import { Toaster } from 'sonner'

import { LoadingProvider } from "@/components/LoadingProvider";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { NumberCapProvider } from "@/lib/contexts/NumberCapContext";
import ReactQueryProvider from '@/components/ReactQueryProvider';
import { ThemeProvider } from "@/components/theme-provider";
import AppLayoutClient from "@/components/AppLayoutClient";
import LotteryNotificationToast from "@/components/LotteryNotificationToast";
import { SchedulerInitializer } from '@/components/SchedulerInitializer';
import { cn } from "@/lib/utils";

const kanit = Kanit({
  subsets: ['thai'],
  display: 'swap',
  variable: '--font-kanit',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: "สิงโตทองคำ 77",
  description: "สิงโตทองคำ 77",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          kanit.variable,
          GeistSans.variable,
          GeistMono.variable
        )}
      >
        <ReactQueryProvider>
          <AuthProvider>
            <NumberCapProvider>
              <LoadingProvider>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="dark"
                  enableSystem
                  disableTransitionOnChange
                >
                    <Toaster position="top-right" />
                    <LotteryNotificationToast />
                    <SchedulerInitializer />
                    <AppLayoutClient>
                      {children}
                    </AppLayoutClient>
                </ThemeProvider>
              </LoadingProvider>
            </NumberCapProvider>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}