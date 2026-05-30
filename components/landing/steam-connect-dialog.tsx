"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type SteamConnectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  steamId: string | null
  steamError: string | null
  isWaiting: boolean
  onStartAuth: () => void
}

export function SteamConnectDialog({
  open,
  onOpenChange,
  steamId,
  steamError,
  isWaiting,
  onStartAuth,
}: SteamConnectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden border-border bg-card/95 p-0 shadow-2xl backdrop-blur-xl">
        <div className="bg-gradient-to-br from-primary/15 via-transparent to-accent/10 px-6 pt-8 pb-6 text-center">
          <DialogHeader className="items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#171a21] shadow-lg shadow-primary/15">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z" />
              </svg>
            </div>
            <DialogTitle>Connect Steam</DialogTitle>
            <DialogDescription className="max-w-sm text-sm">
              Sign in with OpenID to validate your Steam identity. This is a quick test flow, not a full account setup.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-6">
          <section
            className="rounded-2xl border border-border bg-secondary/30 p-4 text-center"
            aria-labelledby="steam-privacy-title"
          >
            <h3 id="steam-privacy-title" className="mb-2 font-semibold">
              Privacy information
            </h3>
            <p className="text-sm text-muted-foreground">
              By continuing, QCoop will request read access to the following Steam account data:
            </p>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>Owned game library</li>
              <li>Friends list</li>
            </ul>
          </section>

          <section className="space-y-3 text-center" aria-labelledby="steam-auth-title">
            <h3 id="steam-auth-title" className="font-semibold">
              OpenID Sign-In
            </h3>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onStartAuth}
                className="inline-flex items-center justify-center overflow-hidden rounded-md border border-border bg-[#171a21] transition-opacity cursor-pointer"
              >
                <img
                  src="/sits_01.png"
                  alt="Sign in through Steam"
                  width={180}
                  height={42}
                  className="block h-auto w-auto"
                />
              </button>
            </div>
            {isWaiting && (
              <p className="text-sm text-primary">Waiting for Steam authentication...</p>
            )}
            {steamId && (
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                Steam authenticated successfully. steamId: {steamId}
              </div>
            )}
            {steamError && <p className="text-sm text-destructive">{steamError}</p>}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
