// Steam needs no OAuth token (just the public steamId via OpenID + the app's
// own STEAM_API_KEY), so persisting/removing the connection can go straight
// from the client to Supabase — RLS on external_accounts already restricts it
// to the owning user. No-ops for anonymous visitors. See
// docs/anonymous-first-flow-plan.md section 3.

import { createClient } from "@/utils/supabase/client"
import { DuplicateAccountLinkError, isUniqueViolation } from "@/lib/external-accounts/duplicate-link-error"

const STEAM_PROVIDER = "steam"

export async function persistSteamAccount(steamId: string): Promise<void> {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return
  }

  const { error } = await supabase.from("external_accounts").upsert(
    {
      user_id: userData.user.id,
      provider: STEAM_PROVIDER,
      provider_account_id: steamId,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  )

  if (error) {
    throw isUniqueViolation(error) ? new DuplicateAccountLinkError("Steam") : error
  }
}

export async function deleteSteamAccount(): Promise<void> {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return
  }

  const { error } = await supabase
    .from("external_accounts")
    .delete()
    .eq("user_id", userData.user.id)
    .eq("provider", STEAM_PROVIDER)

  if (error) {
    throw error
  }
}
