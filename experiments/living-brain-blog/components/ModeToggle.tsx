"use client";

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ModeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState(theme || 'system');

  useEffect(() => {
    const activeTheme = theme === 'system' ? systemTheme : theme;
    setCurrentTheme(activeTheme || 'light');
  }, [theme, systemTheme]);

  const cycleTheme = () => {
    if (currentTheme === 'light') {
      setTheme('dark');
    } else if (currentTheme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className="p-2 rounded-md border border-gray-300 bg-gray-100 dark:bg-gray-800 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center"
    >
      {currentTheme === 'light' ? (
        <Sun className="w-5 h-5 text-yellow-500" />
      ) : currentTheme === 'dark' ? (
        <Moon className="w-5 h-5 text-blue-500" />
      ) : (
        <Sun className="w-5 h-5 text-gray-500" />
      )}
    </button>
  );
}