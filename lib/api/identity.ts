export type ResolvedIdentity = {
  accountId: string
  username: string
}

// Returns the subset of `accountIds` that have a qcoop account, with their
// public username. Safe to call anonymously — see app/api/identity/resolve.
export async function resolveQcoopIdentities(
  provider: "steam" | "epic",
  accountIds: string[],
): Promise<ResolvedIdentity[]> {
  if (accountIds.length === 0) {
    return []
  }

  try {
    const response = await fetch("/api/identity/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, accountIds }),
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return Array.isArray(data?.resolved) ? data.resolved : []
  } catch {
    return []
  }
}
