import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { deleteEpicAccount } from "@/lib/epic/token-store"
import { EPIC_EPHEMERAL_SESSION_COOKIE, deleteEphemeralEpicSession } from "@/lib/epic/ephemeral-session"

// Clears the ephemeral session always, and the BDD-persisted account if the
// caller is logged into qcoop. See docs/anonymous-first-flow-plan.md section 5.
export async function POST() {
  const cookieStore = await cookies()
  await deleteEphemeralEpicSession(cookieStore.get(EPIC_EPHEMERAL_SESSION_COOKIE)?.value)
  cookieStore.delete(EPIC_EPHEMERAL_SESSION_COOKIE)

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (data.user) {
    await deleteEpicAccount(data.user.id)
  }

  return NextResponse.json({ success: true })
}
