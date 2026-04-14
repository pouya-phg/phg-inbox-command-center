"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("phg-theme", theme);
  } catch {}
}

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem("phg-theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {}
  // Fall back to system preference
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = getInitialTheme();
    setTheme(t);
    applyTheme(t);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  // Avoid hydration mismatch — render nothing until client mounts
  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] rounded-md transition-colors w-full"
    >
      {theme === "dark" ? (
        <>
          <Sun className="w-3.5 h-3.5" /> Light mode
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5" /> Dark mode
        </>
      )}
    </button>
  );
}
