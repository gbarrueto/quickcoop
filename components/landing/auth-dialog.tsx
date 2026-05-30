"use client"

import { useState } from "react"
import { User } from "lucide-react"
import {
  loginMockUser,
  registerMockUser,
  type MockUser,
} from "@/lib/mock-auth"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type AuthDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAuthenticated: (user: MockUser) => void
}

export function AuthDialog({ open, onOpenChange, onAuthenticated }: AuthDialogProps) {
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [authName, setAuthName] = useState("")
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)

  const handleSubmit = () => {
    setAuthError(null)

    if (authMode === "register") {
      const result = registerMockUser({
        name: authName,
        email: authEmail,
        password: authPassword,
      })

      if (!result.ok) {
        setAuthError(result.message)
        return
      }

      onAuthenticated(result.user)
      onOpenChange(false)
      return
    }

    const result = loginMockUser({
      email: authEmail,
      password: authPassword,
    })

    if (!result.ok) {
      setAuthError(result.message)
      return
    }

    onAuthenticated(result.user)
    onOpenChange(false)
  }

  const toggleMode = () => {
    setAuthMode(authMode === "login" ? "register" : "login")
    setAuthError(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden border-border bg-card/95 p-0 shadow-2xl backdrop-blur-xl">
        <div className="bg-gradient-to-br from-primary/15 via-transparent to-accent/10 px-6 pt-8 pb-6 text-center">
          <DialogHeader className="items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-lg shadow-primary/15">
              <User className="h-7 w-7" />
            </div>
            <DialogTitle>{authMode === "login" ? "Login" : "Create account"}</DialogTitle>
            <DialogDescription className="max-w-sm text-sm">
              {authMode === "login"
                ? "Use fixed mock credentials or your registered local user."
                : "Create a local mock account without database."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 py-6">
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
              placeholder="demo@qcoop.app"
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
              placeholder="demo123"
            />
          </div>

          {authError && <p className="text-xs text-destructive">{authError}</p>}

          <div className="rounded-md border border-border/70 bg-secondary/20 p-2 text-[11px] text-muted-foreground">
            Demo login: demo@qcoop.app / demo123
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={toggleMode}>
              {authMode === "login" ? "Need account" : "Have account"}
            </Button>
            <Button type="button" className="flex-1" onClick={handleSubmit}>
              {authMode === "login" ? "Login" : "Register"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
