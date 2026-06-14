"use client"

import { useState, useEffect } from "react"
import { useEpicAuth } from "@/hooks/use-epic-auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type EpicConnectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EpicConnectDialog({ open, onOpenChange }: EpicConnectDialogProps) {
  const { epicId, epicError, isWaiting, popupClosed, extensionAvailable, startPopupAuth, submitAuthCode, reset } = useEpicAuth()
  const [authCode, setAuthCode] = useState("")

  useEffect(() => {
    if (epicId && open) {
      setAuthCode("")
      onOpenChange(false)
    }
  }, [epicId, open, onOpenChange])

  const handleConnect = () => {
    startPopupAuth()
  }

  const handleSubmitCode = async () => {
    await submitAuthCode(authCode)
  }

  const handleCancel = () => {
    setAuthCode("")
    reset()
    onOpenChange(false)
  }

  // Manual paste only matters without the extension. With it, the code is
  // captured and submitted automatically.
  const showCodeInput = popupClosed && !extensionAvailable

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden border-border bg-card/95 p-0 shadow-2xl backdrop-blur-xl">
        <div className="bg-gradient-to-br from-primary/15 via-transparent to-accent/10 px-6 pt-8 pb-6 text-center">
          <DialogHeader className="items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#313131] text-white shadow-lg shadow-primary/15">
              <span className="text-xl font-bold">E</span>
            </div>
            <DialogTitle>Connect Epic Games</DialogTitle>
            <DialogDescription className="max-w-sm text-sm">
              {extensionAvailable
                ? "Sign in and we'll connect your account automatically"
                : "Sign in and copy your authorization code"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-6">
          {!popupClosed && !isWaiting && (
            <>
              {epicError && (
                <div className="rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-sm text-red-300">
                  {epicError}
                </div>
              )}

              {extensionAvailable ? (
                <div className="rounded-lg border border-green-400/20 bg-green-400/5 px-4 py-3 text-xs text-green-300 space-y-2">
                  <p className="font-medium">⚡ Automatic mode (extension detected)</p>
                  <ol className="text-left space-y-1 list-decimal list-inside">
                    <li>Click "Connect with Epic" below</li>
                    <li>Log in to your Epic account in the popup</li>
                    <li>That's it — we capture the code and connect you automatically</li>
                  </ol>
                </div>
              ) : (
                <div className="rounded-lg border border-blue-400/20 bg-blue-400/5 px-4 py-3 text-xs text-blue-300 space-y-2">
                  <p className="font-medium">📋 How it works:</p>
                  <ol className="text-left space-y-1 list-decimal list-inside">
                    <li>Click "Connect with Epic" below</li>
                    <li>Log in to your Epic account in the popup</li>
                    <li>You'll see a JSON with your <code className="bg-black/30 px-1 rounded text-xs">authorizationCode</code></li>
                    <li>Copy the code and close the popup</li>
                    <li>Paste it here to finish</li>
                  </ol>
                  <p className="text-[10px] text-blue-300/70 pt-1">
                    💡 Install the QuickCoop extension to skip the copy/paste step.
                  </p>
                </div>
              )}

              <Button
                onClick={handleConnect}
                className="w-full"
                variant="default"
              >
                Connect with Epic
              </Button>
            </>
          )}

          {isWaiting && !popupClosed && (
            <div className="space-y-4 text-center">
              <div className="animate-spin mx-auto h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              <div>
                <p className="text-sm font-semibold mb-1">
                  {extensionAvailable ? "Connecting automatically…" : "Popup is open"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {extensionAvailable
                    ? "Just log in to your Epic account — we'll handle the rest."
                    : (
                      <>
                        Log in, copy the <code className="bg-black/30 px-1 rounded">authorizationCode</code>, then close the popup.
                      </>
                    )}
                </p>
              </div>
              <Button onClick={handleCancel} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          )}

          {showCodeInput && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-400/20 bg-green-400/5 px-3 py-2 text-sm text-green-300 text-center">
                ✅ Popup closed. Paste your code below.
              </div>

              {epicError && (
                <div className="rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-sm text-red-300">
                  {epicError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Authorization Code
                </label>
                <Input
                  type="text"
                  placeholder="Paste your authorizationCode here"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  disabled={isWaiting}
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitCode}
                  disabled={!authCode.trim() || isWaiting}
                  className="flex-1"
                  variant="default"
                >
                  {isWaiting ? "Authenticating..." : "Verify & Connect"}
                </Button>
                <Button onClick={handleCancel} disabled={isWaiting} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
