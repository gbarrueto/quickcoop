import { useState } from "react"
import { ChevronLeft, ChevronRight, Gamepad2, Star } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import type { RecommendedGame } from "@/types"
import { DialogTitle } from "@radix-ui/react-dialog"

type RecommendationsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  games: RecommendedGame[]
}

export function RecommendationsModal({ open, onOpenChange, games }: RecommendationsModalProps) {
  const [current, setCurrent] = useState(0)
  const game = games[current]

  const navigate = (dir: -1 | 1) => {
    const next = current + dir
    if (next < 0 || next >= games.length) return
    setCurrent(next)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-screen lg:max-w-[70vw] max-h-[90vh] h-full w-screen p-0 overflow-hidden bg-card gap-0">

        <DialogTitle className="px-5 py-4">
          <p className="text-xs font-medium">Recommended games for you</p>
        </DialogTitle>

        <div className="flex items-stretch">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={current === 0}
            className="px-3 flex items-center justify-center text-muted-foreground
                       hover:text-foreground hover:bg-primary/60 transition-colors
                       disabled:opacity-0"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>

          <div className="relative flex-1 min-w-0">
            <div className="w-full aspect-video overflow-hidden bg-secondary">
              {game.imageUrl ? (
                <img
                  src={game.imageUrl}
                  alt={game.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Gamepad2 className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
            </div>

            <div className="absolute top-0 right-0 h-full w-[20%] text-center bg-background/60 py-4 px-4">
              <div className="space-y-2">
                <h2 className="text-base font-medium">{game.name}</h2>
                <div className="flex items-center gap-1 justify-center text-secondary text-sm">
                  <Star className="h-4 w-4" />
                  {game.rating}
                </div>
                {game.categories && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {game.categories.map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-md border border-border text-quaternary bg-background/30"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(1)}
            disabled={current === games.length - 1}
            className="px-3 flex items-center justify-center text-muted-foreground
                       hover:text-foreground hover:bg-primary/60 transition-colors
                       disabled:opacity-0"
            aria-label="Siguiente"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </div>

        <div className="px-5 py-4 border-t border-border flex flex-col items-center gap-2">
          <div className="flex gap-1.5">
            {games.map((optionGame, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Juego ${i + 1}`}
                className={`relative w-18 h-10 rounded-full transition-all duration-200
                            ${i === current
                              ? "bg-foreground border-foreground scale-110"
                              : "border-border hover:bg-secondary"}`}
              >
                <img
                  src={optionGame.imageUrl}
                  alt={`${optionGame.name} cover`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className={`absolute top-0 left-0 w-full h-full bg-background/50
                                ${i === current
                                  ? "opacity-0"
                                  : "hover:bg-background/10"
                                }
                              `}
                ></div>
              </button>
            ))}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}