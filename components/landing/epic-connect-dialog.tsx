"use client"

import { updateStoredUserProfile } from "@/lib/user-profile"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

type EpicConnectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EpicConnectDialog({ open, onOpenChange }: EpicConnectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden border-border bg-card/95 p-0 shadow-2xl backdrop-blur-xl">
        <div className="bg-gradient-to-br from-primary/15 via-transparent to-accent/10 px-6 pt-8 pb-6 text-center">
          <DialogHeader className="items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#313131] text-white shadow-lg shadow-primary/15">
              <span className="text-xl font-bold">E</span>
            </div>
            <DialogTitle>Connect Epic Games</DialogTitle>
            <DialogDescription className="max-w-sm text-sm">
              Connect your Epic Games account to continue building your multiplayer match profile.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-6">
          <section className="space-y-3" aria-labelledby="epic-auth-title">
            <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-300">
              <p className="font-medium mb-1">⚠️ Library access not available</p>
              <p>
                Epic Games does not allow third-party apps to read your game library. So you have to import your
                library manually below.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                To add Epic games manually, paste your library below:
              </p>
              <Textarea
                className="min-h-[80px] resize-none text-xs"
                placeholder={"Fortnite\nRocket League\nFallen Order\n..."}
                onChange={(event) => {
                  const games = event.target.value
                    .split("\n")
                    .map((game) => game.trim())
                    .filter(Boolean)
                  updateStoredUserProfile((profile) => ({
                    ...profile,
                    importedGames: Array.from(new Set([...profile.importedGames, ...games])),
                  }))
                }}
              />
              <p className="text-[10px] text-muted-foreground text-center">One game per line.</p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
