import { NextResponse } from "next/server"

type MicrosoftProduct = {
  ProductId: string
  LocalizedProperties?: {
    ProductTitle?: string
    Images?: {
      Uri: string
      ImagePurpose: string
      Width: number
      Height: number
    }[]
  }[]
}

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

async function fetchProductDetails(productIds: string[]): Promise<{ id: string; title: string; imageUrl: string }[]> {
  if (productIds.length === 0) return []

  const chunks: string[][] = []
  for (let i = 0; i < productIds.length; i += 20) {
    chunks.push(productIds.slice(i, i + 20))
  }

  const results: { id: string; title: string; imageUrl: string }[] = []

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const ids = chunk.join(",")
        const url = `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${ids}&market=US&languages=en-us&MS-CV=DGU1mcuYo0WMMp`
        const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 } })

        if (!response.ok) return

        const data = await response.json() as { Products?: MicrosoftProduct[] }

        ;(data.Products ?? []).forEach((product) => {
          const localized = product.LocalizedProperties?.[0]
          const title = localized?.ProductTitle ?? product.ProductId

          // Busca la mejor imagen disponible
          const images = localized?.Images ?? []
          const hero = images.find((img) => img.ImagePurpose === "BoxArt")
            ?? images.find((img) => img.ImagePurpose === "Poster")
            ?? images.find((img) => img.ImagePurpose === "Screenshot")
            ?? images.find((img) => img.Width >= 300)
            ?? images[0]

          const imageUrl = hero
            ? `https:${hero.Uri.startsWith("//") ? hero.Uri : `//${hero.Uri}`}`
            : ""

          results.push({ id: product.ProductId, title, imageUrl })
        })
      } catch {
        // Si un chunk falla, continúa
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
    const games = await fetchProductDetails(limitedIds)

    return NextResponse.json({ games })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message, games: [] }, { status: 500 })
  }
}