"use client"

import { useState } from "react"
import { User } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type AuthDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Carries an anonymous Epic connection (if any) over to the BDD now that the
// user has an active qcoop session. Best-effort: a failure here (e.g. that
// Epic account is already linked to another qcoop user) must not block login.
function migrateEpicSession() {
  fetch("/api/epic/auth/migrate", { method: "POST" }).catch((error) => {
    console.error("[auth-dialog] failed to migrate Epic session", error)
  })
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [authName, setAuthName] = useState("")
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setAuthError(null)
    setInfoMessage(null)
    setIsSubmitting(true)

    const supabase = createClient()

    try {
      if (authMode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: { name: authName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) {
          setAuthError(error.message)
          return
        }

        if (!data.session) {
          setInfoMessage("Check your email to confirm your account, then log in.")
          return
        }

        migrateEpicSession()
        onOpenChange(false)
        return
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      })

      if (error) {
        setAuthError(error.message)
        return
      }

      migrateEpicSession()
      onOpenChange(false)
    } catch (error) {
      console.error("[auth-dialog] unexpected error", error)
      setAuthError(error instanceof Error ? error.message : "Unexpected error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleMode = () => {
    setAuthMode(authMode === "login" ? "register" : "login")
    setAuthError(null)
    setInfoMessage(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden border-border bg-card/95 p-0 shadow-2xl backdrop-blur-xl">
        <div className={`px-6 pt-4 pb-4 text-center 
                        ${authMode === "login" ? "bg-primary/80" : "bg-tertiary/80"}
          `}
        >
          <DialogHeader className="grid items-center justify-center">
            <DialogTitle>{authMode === "login" ? "Login" : "Create account"}</DialogTitle>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 pt-4 pb-6">
          {authMode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="auth-name" className="text-xs text-muted-foreground">
                Name
              </Label>
              <Input
                id="auth-name"
                type="text"
                value={authName}
                onChange={(event) => setAuthName(event.target.value)}
                placeholder="Your name"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="auth-email" className="text-xs text-muted-foreground">
              Email
            </Label>
            <Input
              id="auth-email"
              type="email"
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-password" className="text-xs text-muted-foreground">
              Password
            </Label>
            <Input
              id="auth-password"
              type="password"
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              placeholder="••••••••"
            />
          </div>

          {authError && <p className="text-xs text-destructive">{authError}</p>}
          {infoMessage && (
            <div className="rounded-md border border-border/70 bg-secondary/20 p-2 text-[11px] text-muted-foreground">
              {infoMessage}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={toggleMode}
              className="flex-1 bg-muted/80 hover:bg-muted-foreground/10"
            >
              {authMode === "login" ? "Need account" : "Have account"}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex-1
                          ${authMode === "login"
                            ? "bg-primary/80 hover:bg-primary"
                            : "bg-tertiary/80 hover:bg-tertiary"}
              `}
            >
              {authMode === "login" ? "Login" : "Register"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
