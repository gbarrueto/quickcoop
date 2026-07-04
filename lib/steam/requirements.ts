// Shared parser for Steam's `pc_requirements.minimum` HTML blob — used by both
// the live game-requirements route and the catalog enrichment pipeline, so
// game_listings ends up with the same shape the matching UI already expects.

export type ParsedSteamRequirements = {
  os?: string
  processor?: string
  graphics?: string
  memoryGb?: number
  storageGb?: number
  vramGb?: number
}

function stripHtml(input: string): string {
  return input
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\r/g, "")
}

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, " ").trim()
}

function parseFirstNumberGb(text?: string): number | undefined {
  if (!text) {
    return undefined
  }

  const match = text.match(/(\d+(?:\.\d+)?)\s*GB/i)
  if (!match) {
    return undefined
  }

  const value = Number(match[1])
  return Number.isFinite(value) ? value : undefined
}

function parseByLabel(lines: string[], label: string): string | undefined {
  const prefix = `${label.toLowerCase()}:`
  const line = lines.find((current) => current.toLowerCase().startsWith(prefix))
  if (!line) {
    return undefined
  }

  return line.slice(prefix.length).trim()
}

export function parseMinimumRequirements(rawMinimumHtml: string): { minimumText: string; parsed: ParsedSteamRequirements } {
  const minimumText = stripHtml(rawMinimumHtml)
  const lines = minimumText
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean)

  const os = parseByLabel(lines, "OS")
  const processor = parseByLabel(lines, "Processor")
  const memoryLine = parseByLabel(lines, "Memory")
  const graphics = parseByLabel(lines, "Graphics")
  const storageLine = parseByLabel(lines, "Storage")

  const memoryGb = parseFirstNumberGb(memoryLine)
  const storageGb = parseFirstNumberGb(storageLine)
  const vramGb = parseFirstNumberGb(graphics)

  return {
    minimumText,
    parsed: {
      os,
      processor,
      graphics,
      memoryGb,
      storageGb,
      vramGb,
    },
  }
}
