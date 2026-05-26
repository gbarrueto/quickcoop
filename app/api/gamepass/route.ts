import { NextResponse } from "next/server"

// Estos IDs corresponden a los catálogos de Game Pass PC y Console
const GAMEPASS_CATALOG_IDS = [
  "fdd9e2a7-0fee-49f6-ad69-4354098401ff", // PC Game Pass
  "f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e", // Xbox Game Pass (console)
]

type CatalogEntry = {
  id: string
  market: string
}

type ProductDetails = {
  ProductId: string
  LocalizedProperties?: {
    ProductTitle?: string
    ProductDescription?: string
  }[]
}

async function fetchCatalogIds(catalogId: string): Promise<string[]> {
  const url = `https://catalog.gamepass.com/sigls/v2?id=${catalogId}&language=en-us&market=US`
  const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 } })

  if (!response.ok) return []

  const data = await response.json() as CatalogEntry[]

  // El primer elemento es metadata del catálogo, los demás son juegos
  return data
    .filter((entry) => entry.id && entry.id !== catalogId)
    .map((entry) => entry.id)
}

async function fetchProductTitles(productIds: string[]): Promise<{ id: string; title: string }[]> {
  if (productIds.length === 0) return []

  // Microsoft Store API acepta hasta 20 IDs por request
  const chunks: string[][] = []
  for (let i = 0; i < productIds.length; i += 20) {
    chunks.push(productIds.slice(i, i + 20))
  }

  const results: { id: string; title: string }[] = []

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const ids = chunk.join(",")
        const url = `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${ids}&market=US&languages=en-us&MS-CV=DGU1mcuYo0WMMp`
        const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 } })

        if (!response.ok) return

        const data = await response.json() as { Products?: ProductDetails[] }

        ;(data.Products ?? []).forEach((product) => {
          const title =
            product.LocalizedProperties?.[0]?.ProductTitle ??
            product.ProductId

          results.push({ id: product.ProductId, title })
        })
      } catch {
        // Si un chunk falla, continúa con los demás
      }
    })
  )

  return results
}

export async function GET() {
  try {
    // Obtiene IDs de ambos catálogos y los deduplica
    const [pcIds, consoleIds] = await Promise.all(
      GAMEPASS_CATALOG_IDS.map(fetchCatalogIds)
    )

    const allIds = [...new Set([...pcIds, ...consoleIds])]

    if (allIds.length === 0) {
      return NextResponse.json({ games: [] })
    }

    // Limita a 200 para no sobrecargar en desarrollo
    const limitedIds = allIds.slice(0, 200)
    const games = await fetchProductTitles(limitedIds)

    return NextResponse.json({ games })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message, games: [] }, { status: 500 })
  }
}