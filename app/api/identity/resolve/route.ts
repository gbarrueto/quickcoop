import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/service"

// Stateless "is this provider account a qcoop user?" lookup — never requires
// a qcoop session, never persists anything. The caller already obtained the
// accountIds live from Steam/Epic; this just cross-references the existing
// external_accounts table. See docs/anonymous-first-flow-plan.md section 6a.
const MAX_ACCOUNT_IDS = 200

type ExternalAccountRow = {
  provider_account_id: string
  users: { username: string | null } | { username: string | null }[] | null
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const provider = typeof body?.provider === "string" ? body.provider : null
  const accountIds = Array.isArray(body?.accountIds)
    ? body.accountIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
    : []

  if (!provider || accountIds.length === 0) {
    return NextResponse.json({ resolved: [] })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("external_accounts")
    .select("provider_account_id, users(username)")
    .eq("provider", provider)
    .in("provider_account_id", accountIds.slice(0, MAX_ACCOUNT_IDS))

  if (error) {
    console.error("[identity/resolve] error", error)
    return NextResponse.json({ resolved: [] }, { status: 500 })
  }

  const resolved = ((data ?? []) as ExternalAccountRow[])
    .map((row) => {
      const user = Array.isArray(row.users) ? row.users[0] : row.users
      return user?.username ? { accountId: row.provider_account_id, username: user.username } : null
    })
    .filter((row): row is { accountId: string; username: string } => row !== null)

  return NextResponse.json({ resolved })
}
