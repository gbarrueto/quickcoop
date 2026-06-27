import { CheckCircle2, XCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DEFAULT_PLAYER_SPECS, inferCpuTier, inferGpuTier, osMatchesPlayer } from "@/lib/matching"
import type { GameCard, GameRequirementsPayload, PlayerSystemSpecs, RequirementsParticipant } from "@/types"
import { Spinner } from "../ui/spinner"

type MatchingRequirementsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedGame: GameCard | null
  requirementsByApp: Record<number, GameRequirementsPayload>
  requirementsLoadingByApp: Record<number, boolean>
  requirementsErrorByApp: Record<number, string | null>
  requirementsParticipants: RequirementsParticipant[]
  playerSpecsById: Record<string, PlayerSystemSpecs>
  onUpdatePlayerSpecs: (participantId: string, field: keyof PlayerSystemSpecs, value: string | number) => void
  getParticipantCompatibility: (participantId: string, requirements: GameRequirementsPayload) => { allChecksPass: boolean }
}

const tierOptions = [1, 2, 3, 4, 5]

export function MatchingRequirementsDialog({
  open,
  onOpenChange,
  selectedGame,
  requirementsByApp,
  requirementsLoadingByApp,
  requirementsErrorByApp,
  requirementsParticipants,
  playerSpecsById,
  onUpdatePlayerSpecs,
  getParticipantCompatibility,
}: MatchingRequirementsDialogProps) {
  const requirements = selectedGame ? requirementsByApp[selectedGame.appId] : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        <div className="border-border/70">
          <DialogHeader className="relative gap-2 items-center py-3">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-xl border border-border/70 bg-secondary/30">
              {selectedGame?.imageUrl ? (
                <img src={selectedGame.imageUrl} alt="" className="h-15 w-full object-cover blur-xs" />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-secondary/40 text-sm text-muted-foreground">
                  No image available
                </div>
              )}
            </div>
            <div className="absolute top-0 left-0 h-full w-full bg-background/50"></div>
            <DialogTitle className="z-2">{selectedGame?.name ?? "Game requirements"}</DialogTitle>
            <DialogDescription className="z-2">Review quickly if every selected player can run this game.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-5 pb-4 grid justify-items-center">
          {selectedGame && requirementsLoadingByApp[selectedGame.appId] && (
            <Spinner className="h-8 w-8 text-quaternary" />
          )}

          {selectedGame && requirementsErrorByApp[selectedGame.appId] && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {requirementsErrorByApp[selectedGame.appId]}
            </p>
          )}

          {selectedGame && requirements && (
            <div className="space-y-4">
              {(() => {
                const failedParticipants = requirementsParticipants.filter(
                  (participant) => !getParticipantCompatibility(participant.id, requirements).allChecksPass,
                )
                const everyonePasses = failedParticipants.length === 0

                return (
                  <div
                    className={`rounded-xl border px-3 py-2 text-sm ${everyonePasses ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700" : "border-destructive/40 bg-destructive/10 text-destructive"}`}
                  >
                    {everyonePasses ? (
                      <p className="inline-flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        All selected players meet the minimum requirements.
                      </p>
                    ) : (
                      <p className="font-medium">
                        The minimum requirements are not met by: {failedParticipants.map((participant) => participant.name).join(", ")}.
                      </p>
                    )}
                  </div>
                )
              })()}

              {requirementsParticipants.map((participant) => {
                const specs = playerSpecsById[participant.id] ?? DEFAULT_PLAYER_SPECS
                const requiredCpuTier = inferCpuTier(requirements.parsed.processor)
                const requiredGpuTier = inferGpuTier(requirements.parsed.graphics)
                const compatibilitySummary = getParticipantCompatibility(participant.id, requirements)
                const allChecksPass = compatibilitySummary.allChecksPass

                const checks = [
                  {
                    key: "os",
                    label: "Operating system",
                    pass: osMatchesPlayer(requirements.parsed.os, specs.os),
                    mine: (
                      <input
                        type="text"
                        value={specs.os}
                        onChange={(event) => onUpdatePlayerSpecs(participant.id, "os", event.target.value)}
                        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                      />
                    ),
                    required: requirements.parsed.os ?? "Not specified",
                  },
                  {
                    key: "cpu",
                    label: "Processor",
                    pass: requiredCpuTier === null ? true : specs.cpuTier >= requiredCpuTier,
                    mine: (
                      <select
                        value={specs.cpuTier}
                        onChange={(event) => onUpdatePlayerSpecs(participant.id, "cpuTier", Number(event.target.value))}
                        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                      >
                        {tierOptions.map((tier) => (
                          <option key={`cpu-${tier}`} value={tier}>
                            {tier}
                          </option>
                        ))}
                      </select>
                    ),
                    required:
                      requirements.parsed.processor && requiredCpuTier !== null
                        ? `${requirements.parsed.processor} (Tier ${requiredCpuTier})`
                        : requirements.parsed.processor ?? "Not specified",
                  },
                  {
                    key: "gpu",
                    label: "Graphics card",
                    pass: requiredGpuTier === null ? true : specs.gpuTier >= requiredGpuTier,
                    mine: (
                      <select
                        value={specs.gpuTier}
                        onChange={(event) => onUpdatePlayerSpecs(participant.id, "gpuTier", Number(event.target.value))}
                        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                      >
                        {tierOptions.map((tier) => (
                          <option key={`gpu-${tier}`} value={tier}>
                            {tier}
                          </option>
                        ))}
                      </select>
                    ),
                    required:
                      requirements.parsed.graphics && requiredGpuTier !== null
                        ? `${requirements.parsed.graphics} (Tier ${requiredGpuTier})`
                        : requirements.parsed.graphics ?? "Not specified",
                  },
                  {
                    key: "ram",
                    label: "Memory (RAM)",
                    pass: requirements.parsed.memoryGb === undefined ? true : specs.ramGb >= requirements.parsed.memoryGb,
                    mine: (
                      <input
                        type="number"
                        min={1}
                        value={specs.ramGb}
                        onChange={(event) => onUpdatePlayerSpecs(participant.id, "ramGb", Number(event.target.value) || 0)}
                        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                      />
                    ),
                    required: requirements.parsed.memoryGb !== undefined ? `${requirements.parsed.memoryGb} GB` : "Not specified",
                  },
                  {
                    key: "vram",
                    label: "Video memory (VRAM)",
                    pass: requirements.parsed.vramGb === undefined ? true : specs.vramGb >= requirements.parsed.vramGb,
                    mine: (
                      <input
                        type="number"
                        min={1}
                        value={specs.vramGb}
                        onChange={(event) => onUpdatePlayerSpecs(participant.id, "vramGb", Number(event.target.value) || 0)}
                        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                      />
                    ),
                    required: requirements.parsed.vramGb !== undefined ? `${requirements.parsed.vramGb} GB` : "Not specified",
                  },
                  {
                    key: "storage",
                    label: "Available storage",
                    pass: requirements.parsed.storageGb === undefined ? true : specs.storageGb >= requirements.parsed.storageGb,
                    mine: (
                      <input
                        type="number"
                        min={1}
                        value={specs.storageGb}
                        onChange={(event) => onUpdatePlayerSpecs(participant.id, "storageGb", Number(event.target.value) || 0)}
                        className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                      />
                    ),
                    required: requirements.parsed.storageGb !== undefined ? `${requirements.parsed.storageGb} GB` : "Not specified",
                  },
                ]

                return (
                  <section key={`requirements-${participant.id}`} className="rounded-xl border border-border/70 bg-card/60 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">{participant.name}</h3>
                      {participant.id === "self" && (
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Auto-saved</span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${allChecksPass ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/15 text-destructive"}`}
                      >
                        {allChecksPass ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {allChecksPass ? "Minimum requirements are met" : "Minimum requirements are not met"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {checks.map((check) => (
                        <div
                          key={`${participant.id}-${check.key}`}
                          className={`grid gap-2 rounded-lg border p-2 sm:grid-cols-2 ${check.pass ? "border-emerald-500/30 bg-emerald-500/10" : "border-destructive/30 bg-destructive/10"}`}
                        >
                          <div>
                            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {check.label} - Your specs
                            </p>
                            {check.mine}
                          </div>
                          <div>
                            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Minimum required</p>
                            <p className="min-h-8 rounded-md border border-border bg-background/70 px-2 py-1.5 text-xs">
                              {check.required}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
