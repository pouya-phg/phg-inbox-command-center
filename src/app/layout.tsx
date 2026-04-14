import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SessionProvider from "@/components/SessionProvider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PHG Inbox Command Center",
  description: "AI-powered email triage for Outlook",
};

// Pre-hydration script — sets data-theme before React mounts to prevent flash
const themeScript = `
(function(){try{
  var t = localStorage.getItem('phg-theme');
  if(t !== 'dark' && t !== 'light'){
    t = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.documentElement.setAttribute('data-theme', t);
}catch(e){ document.documentElement.setAttribute('data-theme','dark'); }})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-full bg-[var(--bg-app)] text-[var(--text-primary)]">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
