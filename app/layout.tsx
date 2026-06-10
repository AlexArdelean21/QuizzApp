import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GlobalHeader } from "@/components/global-header";
import { SidebarLayout } from "@/components/sidebar-layout";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { SwipeNavigator } from "@/components/swipe-navigator";
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
  metadataBase: new URL("https://quizhub.ro"),
  title: "QuizHub",
  description: "QuizHub - platforma modernă pentru simulări și practică examene.",
  appleWebApp: {
    capable: true,
    title: "QuizHub",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "QuizHub",
    description: "QuizHub - platforma modernă pentru simulări și practică examene.",
    siteName: "QuizHub",
    locale: "ro_RO",
    type: "website",
  },
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
      <body className="relative min-h-full flex flex-col overflow-x-hidden bg-slate-50 dark:bg-slate-950 noise-overlay">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-20 bg-mesh"
        />
        <SidebarLayout>
          <GlobalHeader />
          <SwipeNavigator>{children}</SwipeNavigator>
        </SidebarLayout>
        <BottomTabBar />
        <SpeedInsights />
      </body>
    </html>
  );
}
