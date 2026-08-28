// src/components/ui/theme-toggle.tsx
//
// Selector Light / Dark / System real, respaldado por next-themes (no un
// simple botón local): persiste en localStorage, respeta prefers-color-scheme
// cuando está en "System", y no parpadea entre temas gracias a suppressHydrationWarning
// en <html> (ver layout.tsx).

'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Label } from './label';
import { LightThemeIcon } from './light-theme';
import { DarkThemeIcon } from './dark-theme';
import { SystemThemeIcon } from './system-theme';

const OPTIONS = [
  { value: 'light', label: 'Claro', Icon: LightThemeIcon },
  { value: 'dark', label: 'Oscuro', Icon: DarkThemeIcon },
  { value: 'system', label: 'Sistema', Icon: SystemThemeIcon },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evita el mismatch de hidratación: el tema real solo se conoce en el cliente
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-[102px] h-7 rounded-full bg-zinc-900/80 border border-zinc-800 animate-pulse" />;
  }

  return (
    <RadioGroup
      value={theme}
      onValueChange={setTheme}
      className="grid-flow-col auto-cols-max items-center gap-0.5 p-1 bg-zinc-900/80 border border-zinc-800 rounded-full"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = theme === value;
        return (
          <Label
            key={value}
            htmlFor={`theme-${value}`}
            className={`flex items-center justify-center h-6 w-6 rounded-full cursor-pointer transition ${
              isActive ? 'bg-[#FF1E42] text-white' : 'text-zinc-400 hover:text-zinc-300'
            }`}
            title={label}
          >
            <RadioGroupItem value={value} id={`theme-${value}`} className="sr-only" />
            <Icon className="h-3.5 w-3.5" />
          </Label>
        );
      })}
    </RadioGroup>
  );
}
