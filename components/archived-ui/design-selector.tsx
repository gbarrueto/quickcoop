"use client"

import { useState, useEffect } from "react"
import { Monitor, Sparkles, Layers } from "lucide-react"

type Theme = "cyber" | "minimal" | "glass"

interface DesignSelectorProps {
  onThemeChange: (theme: Theme) => void
  currentTheme: Theme
}

const themes: { id: Theme; name: string; description: string; icon: React.ReactNode }[] = [
  {
    id: "cyber",
    name: "Cyber Neon",
    description: "Dark cyberpunk aesthetic with neon accents",
    icon: <Monitor className="w-5 h-5" />,
  },
  {
    id: "minimal",
    name: "Clean Minimal",
    description: "Modern and sleek with subtle gaming elements",
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    id: "glass",
    name: "Glass Bold",
    description: "Gradient-heavy with glassmorphism effects",
    icon: <Layers className="w-5 h-5" />,
  },
]

export function DesignSelector({ onThemeChange, currentTheme }: DesignSelectorProps) {
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-card/90 backdrop-blur-xl border border-border rounded-xl p-4 shadow-2xl">
        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Select Design
        </p>
        <div className="flex flex-col gap-2">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onThemeChange(theme.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left ${
                currentTheme === theme.id
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-secondary/50 hover:bg-secondary text-secondary-foreground"
              }`}
            >
              {theme.icon}
              <div>
                <p className="font-medium text-sm">{theme.name}</p>
                <p className="text-xs opacity-70">{theme.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("cyber")

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  return { theme, setTheme }
}
