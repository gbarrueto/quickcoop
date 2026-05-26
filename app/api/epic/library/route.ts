import { NextResponse } from "next/server"

export async function GET() {
  // Epic Games Store no expone la biblioteca personal a apps de terceros.
  // La única API de entitlements disponible es para verificar ownership
  // de productos registrados en tu propio sandbox de EOS.
  return NextResponse.json({
    games: [],
    unavailable: true,
    reason: "Epic Games does not expose user game libraries to third-party applications.",
  })
}