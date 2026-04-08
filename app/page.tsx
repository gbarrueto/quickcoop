"use client"

import { DesignSelector, useTheme } from "@/components/design-selector"
import { LandingCyber } from "@/components/landing-cyber"
import { LandingMinimal } from "@/components/landing-minimal"
import { LandingGlass } from "@/components/landing-glass"

export default function Home() {
  const { theme, setTheme } = useTheme()

  return (
    <>
      <DesignSelector onThemeChange={setTheme} currentTheme={theme} />
      {theme === "cyber" && <LandingCyber />}
      {theme === "minimal" && <LandingMinimal />}
      {theme === "glass" && <LandingGlass />}
    </>
  )
}
