// DB-backed, encrypted storage for a user's Epic OAuth tokens, linked to the
// authenticated qcoop user via external_accounts. Tokens are encrypted at the
// application layer before they ever reach Postgres (see lib/crypto/token-cipher).
//
// All access goes through the service-role client because
// external_account_tokens is locked to the backend only.

import { createServiceClient } from "@/utils/supabase/service"
import { decryptToken, encryptToken } from "@/lib/crypto/token-cipher"

const EPIC_PROVIDER = "epic"

export type EpicTokens = {
  accountId: string
  displayName: string | null
  accessToken: string
  refreshToken: string | null
  tokenType: string | null
  expiresAt: number | null
}

export type SaveEpicTokensInput = {
  accountId: string
  displayName?: string | null
  accessToken: string
  refreshToken?: string | null
  tokenType?: string | null
  expiresAt?: number | null
}

// Upsert the Epic account link for `userId` and store its encrypted tokens.
export async function saveEpicTokens(userId: string, input: SaveEpicTokensInput): Promise<void> {
  const supabase = createServiceClient()

  const { data: account, error: accountError } = await supabase
    .from("external_accounts")
    .upsert(
      {
        user_id: userId,
        provider: EPIC_PROVIDER,
        provider_account_id: input.accountId,
        display_name: input.displayName ?? null,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    )
    .select("id")
    .single()

  if (accountError || !account) {
    throw new Error(`Failed to upsert Epic account: ${accountError?.message ?? "unknown error"}`)
  }

  const { error: tokenError } = await supabase.from("external_account_tokens").upsert(
    {
      account_id: account.id,
      access_token: encryptToken(input.accessToken),
      refresh_token: input.refreshToken ? encryptToken(input.refreshToken) : null,
      token_type: input.tokenType ?? null,
      expires_at: input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id" },
  )

  if (tokenError) {
    throw new Error(`Failed to store Epic tokens: ${tokenError.message}`)
  }
}

// Fetch and decrypt the Epic tokens for `userId`, or null if not connected.
export async function getEpicTokens(userId: string): Promise<EpicTokens | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("external_accounts")
    .select("provider_account_id, display_name, external_account_tokens(access_token, refresh_token, token_type, expires_at)")
    .eq("user_id", userId)
    .eq("provider", EPIC_PROVIDER)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to read Epic account: ${error.message}`)
  }
  if (!data) {
    return null
  }

  // The embedded one-to-one row may come back as an object or a single-element array.
  const tokenRow = Array.isArray(data.external_account_tokens)
    ? data.external_account_tokens[0]
    : data.external_account_tokens
  if (!tokenRow) {
    return null
  }

  return {
    accountId: data.provider_account_id,
    displayName: data.display_name,
    accessToken: decryptToken(tokenRow.access_token),
    refreshToken: tokenRow.refresh_token ? decryptToken(tokenRow.refresh_token) : null,
    tokenType: tokenRow.token_type,
    expiresAt: tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : null,
  }
}

// Disconnect Epic for `userId`: deleting the account cascades to its tokens.
export async function deleteEpicAccount(userId: string): Promise<void> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from("external_accounts")
    .delete()
    .eq("user_id", userId)
    .eq("provider", EPIC_PROVIDER)

  if (error) {
    throw new Error(`Failed to delete Epic account: ${error.message}`)
  }
}
