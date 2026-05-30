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
      <CardContent className="p-6">
        <Tabs defaultValue="link" className="gap-4">
          <TabsList className="w-full grid grid-cols-2 h-auto p-1 mb-0">
            <TabsTrigger value="link" className="py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Link2 className="w-4 h-4 mr-2" />
              Link Account
            </TabsTrigger>
            <TabsTrigger value="import" className="py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Upload className="w-4 h-4 mr-2" />
              Import List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="mt-4">
            <div className="space-y-3" role="group" aria-label="Link game accounts">
              <Button
                type="button"
                onClick={onSteamConnectClick}
                className={`w-full justify-start gap-3 text-white ${
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
                className={`w-full flex items-center justify-between gap-3 px-4 py-2 rounded-md text-white text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
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

              <Button type="button" className="w-full mt-2" disabled={!canBeginMatching} onClick={beginMatching}>
                Begin matching
              </Button>
              {!canBeginMatching && (
                <p className="text-xs text-muted-foreground text-center">
                  {!currentUser ? "Login first to continue." : "Connect at least one account to begin."}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="import" className="mt-4">
            <div className="space-y-3" role="group" aria-label="Import game list">
              <p className="text-xs text-muted-foreground">
                Manually import your library from any platform — one game per line.
              </p>

              {importedGames.length > 0 && (
                <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                  <p className="text-xs text-primary font-medium">✅ {importedGames.length} games imported</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                    {importedGames.slice(0, 3).join(", ")}
                    {importedGames.length > 3 && ` and ${importedGames.length - 3} more...`}
                  </p>
                </div>
              )}

              <Button className="w-full" onClick={onImportClick}>
                <Upload className="w-4 h-4 mr-2" />
                {importedGames.length > 0 ? "Edit imported list" : "Import game list"}
              </Button>

              {importedGames.length > 0 && (
                <Button className="w-full mt-2" onClick={beginMatching} disabled={!canBeginMatching}>
                  Begin matching
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
