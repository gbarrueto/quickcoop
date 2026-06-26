// Epic's friends list returns bare accountIds only (no display name) — names
// have to be resolved separately via the bulk account-info endpoint, up to
// ~100 ids per request. See docs/integracion-epic-xbox.md section 3.2.

const EPIC_ACCOUNT_ENDPOINT = "https://account-public-service-prod03.ol.epicgames.com/account/api/public/account"
const BATCH_SIZE = 100

export async function fetchEpicDisplayNames(
  accessToken: string,
  accountIds: string[],
): Promise<Record<string, string>> {
  const displayNames: Record<string, string> = {}

  for (let i = 0; i < accountIds.length; i += BATCH_SIZE) {
    const batch = accountIds.slice(i, i + BATCH_SIZE)
    const params = new URLSearchParams()
    batch.forEach((id) => params.append("accountId", id))

    const response = await fetch(`${EPIC_ACCOUNT_ENDPOINT}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      console.error("[epic/account-lookup] batch failed", response.status)
      continue
    }

    const accounts: Array<{ id?: string; displayName?: string }> = await response.json()
    for (const account of accounts) {
      if (account.id && account.displayName) {
        displayNames[account.id] = account.displayName
      }
    }
  }

  return displayNames
}
