import Link from "next/link"
import { ArrowLeft, Cpu, LoaderCircle, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MockUser } from "@/lib/mock-auth"

type MatchingHeaderProps = {
  currentUser: MockUser | null
  steamId: string | null
  onOpenSpecs: () => void
}

export function MatchingHeader({ currentUser, steamId, onOpenSpecs }: MatchingHeaderProps) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold">Prepare matching</h1>
        <p className="mt-1 text-muted-foreground">
          Select friends to filter games everyone owns. Drag one friend onto another to merge identities across platforms.
        </p>
        {steamId && <p className="mt-2 text-xs text-muted-foreground">Signed in with Steam ID: {steamId}</p>}
      </div>

      <div className="flex gap-3">
        {currentUser && (
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/40 bg-primary/20">
              <User className="h-3.5 w-3.5" />
            </span>
            <span className="font-medium">{currentUser.name}</span>
            <button
              type="button"
              onClick={onOpenSpecs}
              className="ml-1 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] transition-colors hover:bg-primary/20"
            >
              <Cpu className="h-3 w-3" />
              My specs
            </button>
          </div>
        )}

        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>
    </header>
  )
}
