import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Platform } from "@/types"

const platformLabels: Record<Platform, string> = {
  steam: "Steam",
  epic: "Epic",
  xbox: "Game Pass",
  import: "Import",
  qcoop: "QCoop",
}

const platformClasses: Record<Platform, string> = {
  steam: "border-[#66c0f4]/30 bg-[#1b2838] text-[#66c0f4]",
  epic: "border-white/20 bg-[#313131] text-white",
  xbox: "border-white/20 bg-[#107c10] text-white",
  import: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  qcoop: "border-border bg-secondary/50 text-foreground",
}

type PlatformBadgeProps = {
  platform: Platform
  className?: string
}

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide",
        platformClasses[platform],
        className,
      )}
    >
      {platformLabels[platform]}
    </Badge>
  )
}
