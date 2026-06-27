"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, CheckCircle2, Link2, Upload, CircleQuestionMark, Link2Off, CircleCheckBig } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImportGame } from "@/types/game"

type QuickStartPanelProps = {
  steamId: string | null
  epicId: string | null
  hasGamePass: boolean | null
  importedGames: ImportGame[]
  canBeginMatching: boolean
  onSteamConnectClick: () => void
  onEpicConnectClick: () => void
  onGamePassToggle: () => void
  onImportClick: () => void
}

export function QuickStartPanel({
  steamId,
  epicId,
  hasGamePass,
  importedGames,
  canBeginMatching,
  onSteamConnectClick,
  onEpicConnectClick,
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
            outline-none focus-visible:ring-2 focus-visible:ring-ring/60 cursor-pointer border border-transparent
            transition-all duration-300 ease-in-out
            ${ steamId 
              ? "bg-emerald-600" 
              : "bg-primary/60 hover:bg-primary/90 text-secondary/60 hover:text-secondary/80 shadow-sm shadow-background hover:border-border active:inset-shadow-sm active:inset-shadow-background" }`
          }
        >
          <img className="w-10 h-10" src="/steam-svgrepo-com.svg" alt="steam connection" />
          {steamId 
            ? <CircleCheckBig className="h-6 w-6" />
            : <Link2Off className="h-6 w-6" />
          }
        </div>
        
        <div
          onClick={onEpicConnectClick}
          className={`flex items-center justify-between gap-3 px-6 py-2 rounded-3xl text-sm font-medium 
            outline-none focus-visible:ring-2 focus-visible:ring-ring/60 cursor-pointer border border-transparent
            transition-all duration-300 ease-in-out
            ${ epicId
              ? "bg-emerald-600"
              : "bg-primary/60 hover:bg-primary/90 text-secondary/60 hover:text-secondary/80 shadow-sm shadow-background hover:border-border active:inset-shadow-sm active:inset-shadow-background"
            }
          `}
        >
          <img className="w-10 h-10" src="/epic-games-svgrepo-com.svg" alt="epic connection" />
          {epicId
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
            outline-none focus-visible:ring-2 focus-visible:ring-ring/60 cursor-pointer border border-transparent
            transition-all duration-300 ease-in-out
            ${ hasGamePass 
              ? "bg-emerald-600" 
              : "bg-primary/60 hover:bg-primary/90 text-secondary/60 hover:text-secondary/80 shadow-sm shadow-background hover:border-border active:inset-shadow-sm active:inset-shadow-background" 
            }
          `}
        >
          <div className="flex items-center gap-3">
            <img className="w-10 h-10" src="/xbox-fill-svgrepo-com.svg" alt="gamepass connection" />
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
          className={`flex items-center justify-between gap-3 px-6 py-2 rounded-3xl text-secondary/90 text-sm font-medium 
            outline-none focus-visible:ring-2 focus-visible:ring-ring/60 bg-tertiary/80 cursor-pointer border border-transparent 
            transition-all duration-300 ease-in-out
            hover:text-secondary hover:bg-tertiary hover:border-border
            shadow-sm shadow-background 
            active:inset-shadow-sm active:inset-shadow-background
          `}
        >
          <Upload className="w-8 h-8" />
          {importedGames.length > 0 ? "Edit" : "Import"}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        {!canBeginMatching && (
          <p className="text-xs text-muted-foreground text-center">
            Import games or connect at least one account to begin.
          </p>
        )}
        <Button
          type="button"
          disabled={!canBeginMatching}
          onClick={beginMatching}
          className={`px-8 py-6 w-[50%] rounded-3xl text-white/80 text-lg font-medium 
            outline-none focus-visible:ring-2 focus-visible:ring-ring/60 bg-quaternary/80 
            cursor-pointer border border-transparent shadow-sm shadow-background 
            transition-all duration-300 ease-in-out
            hover:text-white hover:scale-110 hover:bg-quaternary hover:border-border 
            active:inset-shadow-sm active:inset-shadow-background 
          `}
        >
          BEGIN MATCHING
        </Button>
      </div>
    </div>
  )
}
