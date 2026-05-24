const GAMEPASS_CATALOG_URL = 
  "https://catalog.gamepass.com/sigls/v2?id=f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e&language=en-us&market=US"

export async function GET() {
  const response = await fetch(GAMEPASS_CATALOG_URL, {
    next: { revalidate: 60 * 60 * 24 } // cachear 24h, el catálogo no cambia tan seguido
  })
  
  const games = await response.json()
  return NextResponse.json({ games })
}