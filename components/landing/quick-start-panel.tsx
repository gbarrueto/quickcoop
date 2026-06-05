"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, CheckCircle2, Link2, Upload } from "lucide-react"
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
    <Card className="bg-card/50 backdrop-blur border-border rounded-xl py-0 gap-0">
      <CardContent className="flex justify-center gap-5 p-6">

        <Button
          type="button"
          onClick={onSteamConnectClick}
          className={`justify-start gap-3 text-white ${
            steamId ? "bg-emerald-600 hover:bg-emerald-500" : "bg-[#171a21] hover:bg-[#2a475e]"
          }`}
        >
          <img className="w-5 h-5" src="/steam-svgrepo-com.svg" alt="" />
          Connect Steam
          {steamId && (
            <Badge variant="secondary" className="ml-auto bg-white/15 text-white border-transparent">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Connected
            </Badge>
          )}
        </Button>

        <div
          role="switch"
          aria-checked={hasGamePass ?? false}
          tabIndex={0}
          onClick={onGamePassToggle}
          onKeyDown={handleGamePassKeyDown}
          className={`flex items-center justify-between gap-3 px-4 py-2 rounded-md text-white text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
            hasGamePass ? "bg-emerald-600 hover:bg-emerald-500" : "bg-[#107c10] hover:bg-[#0f6f0f]"
          }`}
        >
          <div className="flex items-center gap-3">
            <img className="w-5 h-5" src="/xbox-fill-svgrepo-com.svg" alt="" />
            <span>{hasGamePass ? "Connected Game Pass" : "Connect Xbox / Game Pass"}</span>
            {hasGamePass && (
              <Badge variant="secondary" className="bg-white/15 text-white border-transparent">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Connected
              </Badge>
            )}
          </div>
          <Switch
            checked={hasGamePass ?? false}
            className="pointer-events-none data-[state=checked]:bg-white/30 data-[state=unchecked]:bg-black/20"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
        
        <Button className="" onClick={onImportClick}>
          <Upload className="w-4 h-4 mr-2" />
          {importedGames.length > 0 ? "Edit imported list" : "Import game list"}
        </Button>
      </CardContent>

      <div className="flex flex-col gap-3 p-8">
        <Button type="button" className=" mt-2" disabled={!canBeginMatching || importedGames.length == 0} onClick={beginMatching}>
          Begin matching
        </Button>
        {!canBeginMatching && (
          <p className="text-xs text-muted-foreground text-center">
            {!currentUser ? "Login first to continue." : "Import games or connect at least one account to begin."}
          </p>
        )}
      </div>
    </Card>
  )
}
