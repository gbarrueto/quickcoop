"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Image, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ImportGame } from "@/types/game"

type ImportGamesDialogProps = {
  open: boolean
  importedGames: ImportGame[]
  onConfirm: (importGame: ImportGame[]) => void
  onClose: () => void
}

const GAMES_LIST = [
  { imageUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1551360/capsule_616x353.jpg?t=1746471508", title: "Forza Horizon 5" },
  { imageUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/374320/capsule_616x353.jpg?t=1748630784", title: "Dark Souls 3" },
  { imageUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/582660/header.jpg?t=1773974827", title: "Black Desert" },
  { imageUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1466060/00ad11fb97becadc742bcbb4e871e6d0494c7428/capsule_616x353.jpg?t=1782412343", title: "Tainted Grail: Fall of Avalon" },
]

function normalizeTitle(title: string) {
  return title.toLowerCase().trim()
}

export function ImportGamesDialog({
  open,
  importedGames,
  onConfirm,
  onClose,
}: ImportGamesDialogProps) {
  const [importGames, setImportGames] = useState<ImportGame[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [customName, setCustomName] = useState("")

  useEffect(() => {
    if (open) {
      setImportGames(importedGames.length > 0 ? importedGames : [])
      setSearchTerm("")
      setCustomName("")
    }
  }, [open, importedGames])

  function onAdd(game: ImportGame) {
    setImportGames((current) => {
      const exists = current.some((currentGame) => normalizeTitle(currentGame.title) === normalizeTitle(game.title))
      if (exists) {
        return current
      }

      return [...current, game]
    })
  }

  function onRemove(game: ImportGame) {
    setImportGames((current) => current.filter((currentGame) => normalizeTitle(currentGame.title) !== normalizeTitle(game.title)))
  }

  function onAddCustomGame() {
    const title = customName.trim()
    if (!title) {
      return
    }

    onAdd({ title })
    setCustomName("")
  }

  function onCustomNameKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      onAddCustomGame()
    }
  }

  function onDone() {
    onConfirm(importGames)
    onClose()
  }

  const importedTitles = useMemo(
    () => new Set(importGames.map((game) => normalizeTitle(game.title))),
    [importGames],
  )

  const filteredGames = useMemo(() => {
    const term = normalizeTitle(searchTerm)
    return GAMES_LIST
      .filter((game) => !importedTitles.has(normalizeTitle(game.title)))
      .filter((game) => {
        if (!term) return true
        return normalizeTitle(game.title).includes(term)
      })
  }, [importedTitles, searchTerm])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="w-full lg:max-w-[60vw] h-full max-h-[90vh] overflow-hidden border-border bg-card/95 p-0 shadow-2xl backdrop-blur-xl flex flex-col gap-0"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {event.preventDefault(); onDone()}}
        showCloseButton={false}
      >
        <div className="shrink-0 p-4">
          <DialogHeader className="grid grid-rows-1 grid-cols-[100%_0] items-center px-2">
            <DialogTitle className="text-center">Import games</DialogTitle>
            <Button className="justify-self-end" onClick={onDone}>Done</Button>
          </DialogHeader>
        </div>

        <div className="flex-1 min-h-0 grid min-h-0 grid-cols-2">
          <div className="flex min-h-0 flex-col w-full h-full py-2 px-4 gap-2">
            <section className="text-xs text-white/70 text-center">
              Search and add a game. If you can't find it, is possible to add by custom name.
            </section>
            
            <section className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input 
                placeholder="Search game"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="bg-background w-full rounded-md border border-border px-8 py-2 text-sm outline-none transition-colors focus:border-primary"
              />
            </section>
            
            <section className="flex-1 min-h-0 overflow-y-auto">
              {filteredGames.length > 0 ? (
                filteredGames.map((game, index) => (
                  <button
                    key={`${index}-${game.title}`}
                    type="button"
                    onClick={() => onAdd(game)}
                    className="group flex w-full items-center gap-2 pr-4 text-left text-secondary transition-all duration-300 ease-in-out hover:bg-primary/40 hover:text-white"
                  >
                    <div className="flex aspect-video w-20 min-h-10 items-center justify-center bg-background/40">
                      {game.imageUrl ? (
                        <img src={game.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Image className="h-5 w-5" />
                      )}
                    </div>
                    <p className="flex-1 truncate text-sm">{game.title}</p>
                    <ArrowRight className="h-5 w-5 shrink-0" />
                  </button>
                ))
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
                  No matching games found.
                </div>
              )}
            </section>

            <section className="flex w-full">
              <input
                placeholder="Custom name"
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                onKeyDown={onCustomNameKeyDown}
                className="bg-background flex-1 rounded-l-md border border-border px-2 py-2 text-sm outline-none transition-colors focus:border-primary"
              />
              <Button
                type="button"
                onClick={onAddCustomGame}
                disabled={!customName.trim()}
                className="rounded-l-none bg-secondary/80 text-white/80 hover:bg-secondary hover:text-white"
              >
                Import
                <ArrowRight className="h-4 w-4" />
              </Button>
            </section>
          </div>
          
          <div className="min-h-0 w-full h-full">
            {importGames.length > 0 && (
              <section className="flex min-h-0 flex-col w-full h-full bg-secondary/20 p-3 gap-2">
                <p className="text-xs text-muted-foreground text-center font-medium">
                  Imported Games
                </p>

                <section className="flex-1 min-h-0 bg-background/10 overflow-y-auto">
                  {importGames.map((game, index) => (
                    <div 
                      key={`${index}-${game.title}`}
                      className={`flex items-center gap-2 pr-4 text-quaternary
                        transition-all duration-300 ease-in-out 
                      `}
                    >
                      <div className="flex aspect-video w-20 min-h-10 max-h-15 items-center justify-center bg-background/40">
                        {game.imageUrl ? (
                          <img src={game.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Image className="h-5 w-5" />
                        )}
                      </div>
                      <p className="flex-1 truncate text-sm">{game.title}</p>
                      <button
                        type="button"
                        onClick={() => onRemove(game)}
                        className="flex h-10 w-15 items-center justify-center text-red-700/70 transition-all duration-300 ease-in-out hover:text-red-700"
                        aria-label={`Remove ${game.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </section>
              </section>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
