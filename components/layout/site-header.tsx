import Link from "next/link"
import { Gamepad2, User } from "lucide-react"
import type { MockUser } from "@/types"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type SiteHeaderProps = {
  currentUser: MockUser | null
  onLoginClick: () => void
  onLogout: () => void
}

export function SiteHeader({ currentUser, onLoginClick, onLogout }: SiteHeaderProps) {
  return (
    <header className="relative z-10">
      <nav className="fixed w-full bg-black/20 shadow-xl" aria-label="Primary">
        <div className="flex items-center justify-between px-6 py-4 lg:px-12">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">QCoop</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
          </div>
          {currentUser ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-9 w-9 border border-primary/40 bg-primary/15">
                <AvatarFallback className="bg-primary/15 text-primary">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-medium leading-none">{currentUser.name}</p>
                <p className="text-[10px] text-muted-foreground leading-none mt-1">Connected</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={onLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="border-primary/50 hover:bg-primary/10"
              onClick={onLoginClick}
            >
              Login
            </Button>
          )}
        </div>
      </nav>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="relative z-10 px-6 py-12 lg:px-12 border-t border-border">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <Gamepad2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">QCoop</span>
        </div>
        <p className="text-sm text-muted-foreground">Computines • 2026</p>
        <Link
          href="/privacy"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  )
}
