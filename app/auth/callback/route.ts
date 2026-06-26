import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { migrateEphemeralEpicSession } from "@/lib/epic/migrate-ephemeral-session"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        await migrateEphemeralEpicSession(data.user.id)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`)
}
