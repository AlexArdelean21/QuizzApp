import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GlobalHeader } from "@/components/global-header";
import { SidebarLayout } from "@/components/sidebar-layout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuizHub",
  description: "QuizHub - platforma modernă pentru simulări și practică examene.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="relative min-h-full flex flex-col overflow-x-hidden bg-slate-50 dark:bg-slate-950">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-20 bg-fine-grid [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed -left-40 -top-48 -z-10 h-[36rem] w-[36rem] rounded-full blur-3xl aura-drift-slow"
          style={{ background: "radial-gradient(circle, var(--aura-color-1), transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none fixed -right-48 -bottom-40 -z-10 h-[40rem] w-[40rem] rounded-full blur-3xl aura-drift-slower"
          style={{ background: "radial-gradient(circle, var(--aura-color-2), transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, var(--aura-color-3), transparent 70%)" }}
        />
        <SidebarLayout>
          <GlobalHeader />
          {children}
        </SidebarLayout>
        <SpeedInsights />
      </body>
    </html>
  );
}
