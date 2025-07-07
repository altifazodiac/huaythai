import type { Metadata } from "next";
import { Geist, Geist_Mono, Kanit } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner'
import { ThemeProvider } from "@/components/theme-provider"
import { LoadingProvider } from "@/components/LoadingProvider";
import AppLayoutClient from "@/components/AppLayoutClient";
import { AuthProvider } from "@/lib/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "สิงโตทองคำ 77",
  description: "เว็บหวยออนไลน์ที่ครบทุกชนิด",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${kanit.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <LoadingProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <Toaster position="top-right" />
              <AppLayoutClient>
                {children}
              </AppLayoutClient>
            </ThemeProvider>
          </LoadingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}