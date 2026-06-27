"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CircleCheckBig, SquareArrowOutUpRight } from "lucide-react"
import Link from "next/link"
import type { AuthUser } from "@/types"

type SteamConnectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  steamId: string | null
  steamError: string | null
  isWaiting: boolean
  currentUser: AuthUser | null
  onStartAuth: () => void
  onDisconnect: () => void
}

export function SteamConnectDialog({
  open,
  onOpenChange,
  steamId,
  steamError,
  isWaiting,
  currentUser,
  onStartAuth,
  onDisconnect,
}: SteamConnectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden border-border bg-card/95 p-0 shadow-2xl backdrop-blur-xl">
        <div className="pt-6 pb-6 text-center bg-primary/20">
          <DialogHeader className="items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl">
              <img className="w-10 h-10 shadow-lg shadow-primary/15 rounded-full bg-primary/10" src="/steam-svgrepo-com.svg" alt="steam login" />
            </div>
            <DialogTitle>Connect Steam</DialogTitle>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-6">
          <section
            className="rounded-2xl border border-border bg-tertiary/10 p-4 text-center"
            aria-labelledby="steam-privacy-title"
          >
            <div className="flex justify-center gap-2 items-center mb-2">
              <h3 id="steam-privacy-title" className="font-semibold">
                Privacy information
              </h3>
              <Link
                href="/privacy"
                className="text-primary/80 hover:text-primary"
              >
                <SquareArrowOutUpRight className="w-4 h-4" />
              </Link>
            </div>
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
            {steamId
            ? (
              <div className="space-y-3">
                <div className="flex justify-center gap-2 items-center rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                  Steam authenticated successfully
                  <CircleCheckBig className="h-4 w-4" />
                </div>
                <Button onClick={onDisconnect} variant="outline" className="w-full">
                  Disconnect Steam account
                </Button>
                {!currentUser && (
                  <p className="text-xs text-muted-foreground">
                    Sign up to keep this connection saved across devices and sessions.
                  </p>
                )}
              </div>
              )
            : (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onStartAuth}
                  className="inline-flex items-center justify-center overflow-hidden rounded-md border border-border bg-[#171a21] transition-opacity cursor-pointer"
                >
                  <img
                    src="/sits_01.png"
                    alt="Sign in through Steam OpenID"
                    width={180}
                    height={42}
                    className="block h-auto w-auto"
                  />
                </button>
              </div>
              )
            }
            {isWaiting && (
              <p className="text-sm text-primary">Waiting for Steam authentication...</p>
            )}
            {steamError && <p className="text-sm text-destructive">{steamError}</p>}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
