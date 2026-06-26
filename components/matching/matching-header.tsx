import Link from "next/link"
import { ArrowLeft, Cpu, LoaderCircle, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AuthUser } from "@/types"
import { GameRecommendations } from "./game-recommendations"
import { RECOMMENDED_GAMES } from "@/lib/matching"

type MatchingHeaderProps = {
  currentUser: AuthUser | null
  steamId: string | null
  activeIndex: number
  onOpenSpecs: () => void
}

export function MatchingHeader({ currentUser, steamId, onOpenSpecs, activeIndex }: MatchingHeaderProps) {
  return (
    <header className="relative flex flex-col gap-4 px-4 py-2 md:flex-row md:items-center md:justify-between">
      <div className="z-2">
        <h1 className="text-3xl font-bold text-secondary">Prepare matching</h1>
        <p className="mt-1 text-white/70">
          Select friends to filter games everyone owns. Drag one friend onto another to merge identities across platforms.
        </p>
      </div>

      <div className="flex gap-3 z-2">
        {currentUser && (
          <div className="inline-flex items-center gap-2 rounded-full border border-background/90 bg-background/80 px-3 py-1.5 text-xs text-primary">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/40">
              <User className="h-3.5 w-3.5" />
            </span>
            <span className="font-medium">{currentUser.name}</span>
            <button
              type="button"
              onClick={onOpenSpecs}
              className="ml-1 inline-flex items-center gap-1 rounded-full border border-primary/50 px-2 py-0.5 text-[10px] transition-colors hover:bg-primary/40 hover:text-secondary"
            >
              <Cpu className="h-3 w-3" />
              My specs
            </button>
          </div>
        )}

        <Link href="/" className="z-2">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      <GameRecommendations
        games={RECOMMENDED_GAMES}
        activeIndex={activeIndex}
      />
    </header>
  )
}
