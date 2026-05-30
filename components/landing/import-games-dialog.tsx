"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type ImportGamesDialogProps = {
  open: boolean
  importedGames: string[]
  onConfirm: (importText: string) => void
  onClose: () => void
}

export function ImportGamesDialog({
  open,
  importedGames,
  onConfirm,
  onClose,
}: ImportGamesDialogProps) {
  const [importText, setImportText] = useState("")

  useEffect(() => {
    if (open) {
      setImportText(importedGames.length > 0 ? importedGames.join("\n") : "")
    }
  }, [open, importedGames])

  const detectedGames = importText
    .split("\n")
    .map((game) => game.trim())
    .filter(Boolean)

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-xl overflow-hidden border-border bg-card/95 p-0 shadow-2xl backdrop-blur-xl"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <div className="bg-gradient-to-br from-primary/15 via-transparent to-accent/10 px-6 pt-8 pb-6">
          <DialogHeader className="items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary shadow-lg">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle>Import game list</DialogTitle>
            <DialogDescription className="max-w-sm text-sm">
              Paste your games one per line. Works with any platform — Epic, Xbox, GOG, or any other.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="import-textarea">Your games</Label>
              {detectedGames.length > 0 && (
                <span className="text-xs text-primary">{detectedGames.length} games detected</span>
              )}
            </div>
            <Textarea
              id="import-textarea"
              className="min-h-[200px] resize-none rounded-xl bg-background/70"
              placeholder={"Rocket League\nFortnite\nFallen Order\nCyberpunk 2077\n..."}
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              spellCheck={false}
            />
            <p className="text-[10px] text-muted-foreground">
              One game per line. Names are matched case-insensitively when comparing with friends.
            </p>
          </div>

          {detectedGames.length > 0 && (
            <section className="rounded-xl border border-border bg-secondary/20 p-3 max-h-32 overflow-y-auto">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-medium">
                Preview
              </p>
              <div className="flex flex-wrap gap-1.5">
                {detectedGames.map((game) => (
                  <Badge
                    key={game}
                    variant="outline"
                    className="text-[10px] font-normal text-muted-foreground"
                  >
                    {game}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={detectedGames.length === 0}
              onClick={() => onConfirm(importText)}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Import {detectedGames.length > 0 ? `${detectedGames.length} games` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
