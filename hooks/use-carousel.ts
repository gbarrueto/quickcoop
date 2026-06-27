import { useState, useCallback, useEffect } from "react"

export function useCarousel(total: number, autoPlayInterval = 1000) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [resetKey, setResetKey] = useState(0)

  const goTo = useCallback((index: number) => {
    setActiveIndex(index)
    // Restart the autoplay countdown so a manual click isn't immediately
    // overridden by an in-flight interval tick.
    setResetKey((key) => key + 1)
  }, [])

  const next = useCallback(() => {
    setActiveIndex(prev => (prev + 1) % total)
  }, [total])

  const prev = useCallback(() => {
    setActiveIndex(prev => (prev - 1 + total) % total)
  }, [total])

  useEffect(() => {
    if (total <= 1) return

    const interval = setInterval(next, autoPlayInterval)
    return () => clearInterval(interval)
  }, [next, total, autoPlayInterval, resetKey])

  return { activeIndex, goTo, next, prev }
}