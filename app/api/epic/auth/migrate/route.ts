import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { migrateEphemeralEpicSession } from "@/lib/epic/migrate-ephemeral-session"

// Called right after a successful login/register to carry an anonymous Epic
// connection into the BDD. No-op if there is no ephemeral session to migrate.
export async function POST() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (!data.user) {
    return NextResponse.json({ migrated: false }, { status: 401 })
  }

  await migrateEphemeralEpicSession(data.user.id)

  return NextResponse.json({ migrated: true })
}
