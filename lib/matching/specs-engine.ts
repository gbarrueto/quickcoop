import type { GameRequirementsPayload, PlayerSystemSpecs } from "@/types"

export function inferCpuTier(text?: string): number | null {
  if (!text) {
    return null
  }

  const normalized = text.toLowerCase()

  if (/i9|ryzen\s*9/.test(normalized)) {
    return 5
  }

  if (/i7|ryzen\s*7|8\s*core|octa/.test(normalized)) {
    return 4
  }

  if (/i5|ryzen\s*5|6\s*core|quad|fx-6/.test(normalized)) {
    return 3
  }

  if (/i3|ryzen\s*3|dual|2\s*core|fx-4/.test(normalized)) {
    return 2
  }

  return 1
}

export function inferGpuTier(text?: string): number | null {
  if (!text) {
    return null
  }

  const normalized = text.toLowerCase()

  if (/rtx\s*40|rx\s*7|arc\s*a7/.test(normalized)) {
    return 5
  }

  if (/rtx\s*30|rtx\s*20|gtx\s*10|rx\s*6|vulkan/.test(normalized)) {
    return 4
  }

  if (/gtx\s*9|r9|rx\s*5|dx11|directx\s*11/.test(normalized)) {
    return 3
  }

  if (/gtx\s*7|gt\s*7|hd\s*5|dx10/.test(normalized)) {
    return 2
  }

  return 1
}

export function osMatchesPlayer(requiredOs: string | undefined, playerOs: string): boolean {
  if (!requiredOs) {
    return true
  }

  const normalizedRequired = requiredOs.toLowerCase()
  const normalizedPlayer = playerOs.toLowerCase()

  if (normalizedRequired.includes("windows")) {
    return normalizedPlayer.includes("windows")
  }

  if (normalizedRequired.includes("linux") || normalizedRequired.includes("steamos")) {
    return normalizedPlayer.includes("linux") || normalizedPlayer.includes("steamos")
  }

  if (normalizedRequired.includes("mac") || normalizedRequired.includes("os x")) {
    return normalizedPlayer.includes("mac") || normalizedPlayer.includes("os x")
  }

  return normalizedPlayer.includes(normalizedRequired.slice(0, 8))
}

export type CompatibilityCheck = {
  key: string
  label: string
  pass: boolean
}

export type CompatibilitySummary = {
  allChecksPass: boolean
  failedLabels: string[]
  checks: CompatibilityCheck[]
}

export function evaluateParticipantCompatibility(
  specs: PlayerSystemSpecs,
  requirements: GameRequirementsPayload,
): CompatibilitySummary {
  const requiredCpuTier = inferCpuTier(requirements.parsed.processor)
  const requiredGpuTier = inferGpuTier(requirements.parsed.graphics)

  const checks: CompatibilityCheck[] = [
    {
      key: "os",
      label: "Operating system",
      pass: osMatchesPlayer(requirements.parsed.os, specs.os),
    },
    {
      key: "cpu",
      label: "Processor",
      pass: requiredCpuTier === null ? true : specs.cpuTier >= requiredCpuTier,
    },
    {
      key: "gpu",
      label: "Graphics card",
      pass: requiredGpuTier === null ? true : specs.gpuTier >= requiredGpuTier,
    },
    {
      key: "ram",
      label: "Memory (RAM)",
      pass:
        requirements.parsed.memoryGb === undefined ? true : specs.ramGb >= requirements.parsed.memoryGb,
    },
    {
      key: "vram",
      label: "Video memory (VRAM)",
      pass:
        requirements.parsed.vramGb === undefined ? true : specs.vramGb >= requirements.parsed.vramGb,
    },
    {
      key: "storage",
      label: "Available storage",
      pass:
        requirements.parsed.storageGb === undefined
          ? true
          : specs.storageGb >= requirements.parsed.storageGb,
    },
  ]

  return {
    allChecksPass: checks.every((check) => check.pass),
    failedLabels: checks.filter((check) => !check.pass).map((check) => check.label),
    checks,
  }
}
