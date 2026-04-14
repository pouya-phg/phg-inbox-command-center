import type { Metadata } from "next";
import Script from "next/script";
import "../globals.css";

export const metadata: Metadata = {
  title: "PHG AI Triage",
  description: "AI email triage sidebar for Outlook",
};

export default function AddonLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Pre-hydration theme script */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){try{
            var t = localStorage.getItem('phg-theme');
            if(t !== 'dark' && t !== 'light'){
              t = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
            }
            document.documentElement.setAttribute('data-theme', t);
          }catch(e){ document.documentElement.setAttribute('data-theme','dark'); }})();
        `}} />
      </head>
      <body className="h-full bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden">
        <Script src="https://appsforoffice.microsoft.com/lib/1.1/hosted/office.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
