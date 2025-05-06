"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/use-theme";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className="relative h-9 w-9 cursor-pointer border border-neutral-400 dark:border-neutral-500 rounded-full overflow-hidden"
      aria-label="Toggle theme"
    >
      <Sun
        className={`absolute h-5 w-5 transition-all duration-800 ease-in-out ${
          theme === "light"
            ? "translate-x-0 translate-y-0 opacity-100"
            : "translate-x-10 -translate-y-10 opacity-0"
        }`}
      />

      <Moon
        className={`absolute h-5 w-5 transition-all duration-800 ease-in-out ${
          theme === "dark"
            ? "translate-x-0 translate-y-0 opacity-100"
            : "-translate-x-10 translate-y-10 opacity-0"
        }`}
      />

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`absolute h-5 w-5 transition-all duration-800 ease-in-out ${
          theme === "system"
            ? "translate-x-0 translate-y-0 opacity-100"
            : "translate-y-10 translate-x-10 opacity-0"
        }`}
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" x2="16" y1="21" y2="21" />
        <line x1="12" x2="12" y1="17" y2="21" />
      </svg>

      <span className="sr-only">
        {theme === "light"
          ? "Light mode"
          : theme === "dark"
          ? "Dark mode"
          : "System mode"}
      </span>
    </Button>
  );
}
