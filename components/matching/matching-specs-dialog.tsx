import { Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DEFAULT_PLAYER_SPECS, TIER_OPTIONS } from "@/lib/matching"
import type { PlayerSystemSpecs } from "@/types"

type MatchingSpecsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  playerSpecsById: Record<string, PlayerSystemSpecs>
  onUpdatePlayerSpecs: (participantId: string, field: keyof PlayerSystemSpecs, value: string | number) => void
}

const osOptions = ["Windows 10", "Windows 11", "macOS", "Linux"]
const cpuLabels = ["Budget", "Entry", "Mid", "High", "Top"]
const gpuLabels = ["DX10", "DX11", "GTX 9xx", "RTX 20/30", "RTX 40+"]
const ramOptions = [4, 8, 16, 32]
const vramOptions = [2, 4, 8, 12]
const storageOptions = [50, 100, 200, 500, 1000]

export function MatchingSpecsDialog({ open, onOpenChange, playerSpecsById, onUpdatePlayerSpecs }: MatchingSpecsDialogProps) {
  const specs = playerSpecsById.self ?? DEFAULT_PLAYER_SPECS

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden border-border bg-card/95 p-0 shadow-2xl backdrop-blur-xl">
        <div className="bg-gradient-to-br from-primary/15 via-transparent to-accent/10 px-6 pb-6 pt-8">
          <DialogHeader className="items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-lg">
              <Cpu className="h-7 w-7" />
            </div>
            <DialogTitle>My hardware specs</DialogTitle>
            <DialogDescription className="max-w-sm text-sm">
              Set your specs once and they'll be used automatically when checking game requirements.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Operating System</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {osOptions.map((os) => (
                <button
                  key={os}
                  type="button"
                  onClick={() => onUpdatePlayerSpecs("self", "os", os)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${specs.os === os ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"}`}
                >
                  {os}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Processor (CPU)</label>
            <div className="grid grid-cols-5 gap-2">
              {TIER_OPTIONS.map((tier, index) => (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => onUpdatePlayerSpecs("self", "cpuTier", tier.value)}
                  className={`flex flex-col items-center rounded-lg border px-2 py-2 text-xs transition-colors ${specs.cpuTier === tier.value ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"}`}
                >
                  <span className="font-semibold">{tier.value}</span>
                  <span className="mt-0.5 text-[9px] opacity-70">{cpuLabels[index]}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">1 = old budget CPU (Pentium, FX-4) · 5 = flagship (i9, Ryzen 9)</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Graphics Card (GPU)</label>
            <div className="grid grid-cols-5 gap-2">
              {TIER_OPTIONS.map((tier, index) => (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => onUpdatePlayerSpecs("self", "gpuTier", tier.value)}
                  className={`flex flex-col items-center rounded-lg border px-2 py-2 text-xs transition-colors ${specs.gpuTier === tier.value ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"}`}
                >
                  <span className="font-semibold">{tier.value}</span>
                  <span className="mt-0.5 text-[9px] opacity-70">{gpuLabels[index]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">RAM (GB)</label>
              <div className="grid grid-cols-4 gap-1.5">
                {ramOptions.map((gb) => (
                  <button
                    key={gb}
                    type="button"
                    onClick={() => onUpdatePlayerSpecs("self", "ramGb", gb)}
                    className={`rounded-lg border py-2 text-xs font-medium transition-colors ${specs.ramGb === gb ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"}`}
                  >
                    {gb}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">VRAM (GB)</label>
              <div className="grid grid-cols-4 gap-1.5">
                {vramOptions.map((gb) => (
                  <button
                    key={gb}
                    type="button"
                    onClick={() => onUpdatePlayerSpecs("self", "vramGb", gb)}
                    className={`rounded-lg border py-2 text-xs font-medium transition-colors ${specs.vramGb === gb ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"}`}
                  >
                    {gb}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Available Storage (GB)</label>
            <div className="grid grid-cols-5 gap-2">
              {storageOptions.map((gb) => (
                <button
                  key={gb}
                  type="button"
                  onClick={() => onUpdatePlayerSpecs("self", "storageGb", gb)}
                  className={`rounded-lg border py-2 text-xs font-medium transition-colors ${specs.storageGb === gb ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"}`}
                >
                  {gb}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Current specs</p>
            <p>
              {specs.os} · CPU Tier {specs.cpuTier} · GPU Tier {specs.gpuTier} · {specs.ramGb}GB RAM · {specs.vramGb}GB VRAM · {specs.storageGb}GB Storage
            </p>
            <p className="mt-1 text-[10px] text-primary/70">Changes are saved automatically.</p>
          </div>

          <Button type="button" className="w-full" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
