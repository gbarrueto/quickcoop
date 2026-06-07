"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, CheckCircle2, Link2, Upload, CircleQuestionMark, Link2Off, CircleCheckBig } from "lucide-react"
import type { MockUser } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type QuickStartPanelProps = {
  currentUser: MockUser | null
  steamId: string | null
  hasGamePass: boolean | null
  importedGames: string[]
  canBeginMatching: boolean
  onSteamConnectClick: () => void
  onGamePassToggle: () => void
  onImportClick: () => void
}

export function QuickStartPanel({
  currentUser,
  steamId,
  hasGamePass,
  importedGames,
  canBeginMatching,
  onSteamConnectClick,
  onGamePassToggle,
  onImportClick,
}: QuickStartPanelProps) {
  const router = useRouter()

  const beginMatching = () => {
    if (!canBeginMatching) {
      return
    }
    router.push("/matching")
  }

  const handleGamePassKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onGamePassToggle()
    }
  }

  return (
    <div className="grid grid-rows-2 h-full">

      <div className="flex justify-center gap-6 p-4 text-tertiary">
        <div
          onClick={onSteamConnectClick}
          className={`flex items-center justify-between gap-3 px-6 py-2 rounded-3xl text-sm font-medium 
            transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 
            ${ steamId 
              ? "bg-emerald-600" 
              : "bg-primary/80 hover:bg-primary text-secondary/60 hover:text-secondary/80" }`
          }
        >
          <img className="w-10 h-10" src="/steam-svgrepo-com.svg" alt="steam" />
          {steamId 
            ? <CircleCheckBig className="h-6 w-6" />
            : <Link2Off className="h-6 w-6" />
          }
        </div>

        <div
          role="switch"
          aria-checked={hasGamePass ?? false}
          tabIndex={0}
          onClick={onGamePassToggle}
          onKeyDown={handleGamePassKeyDown}
          className={`flex items-center justify-between gap-3 px-6 py-2 rounded-3xl text-sm font-medium 
            transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 
            ${ hasGamePass 
              ? "bg-emerald-600" 
              : "bg-primary/80 hover:bg-primary text-secondary/60 hover:text-secondary/80" 
            }`
          }
        >
          <div className="flex items-center gap-3">
            <img className="w-10 h-10" src="/xbox-fill-svgrepo-com.svg" alt="gamepass" />
            {hasGamePass 
              ? <CircleCheckBig className="h-6 w-6" />
              : <Link2Off className="h-6 w-6" />
            }
          </div>
          <Switch
            checked={hasGamePass ?? false}
            className="hidden pointer-events-none data-[state=checked]:bg-white/30 data-[state=unchecked]:bg-black/20"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
        
        <div 
          onClick={onImportClick}
          className={`flex items-center justify-between gap-3 px-6 py-2 rounded-3xl text-secondary/80 hover:text-secondary text-sm font-medium 
            transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 bg-tertiary/80 hover:bg-tertiary }`
          }
        >
          <Upload className="w-8 h-8" />
          {importedGames.length > 0 ? "Edit" : "Import"}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        {!canBeginMatching && (
          <p className="text-xs text-muted-foreground text-center">
            {!currentUser ? "Login first to continue." : "Import games or connect at least one account to begin."}
          </p>
        )}
        <Button 
          type="button" 
          disabled={!canBeginMatching || importedGames.length == 0} 
          onClick={beginMatching}
          className={`px-8 py-6 w-[50%] rounded-3xl text-white text-lg font-medium 
            transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 bg-quaternary/80 hover:bg-quaternary`
          }
        >
          BEGIN MATCHING
        </Button>
      </div>
    </div>
  )
}
