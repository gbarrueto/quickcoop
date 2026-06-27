// Cache-aware namespace -> slug resolution (docs/database-design.md section 6).
// Epic's productmapping endpoint is a full bulk dump, not queryable by
// namespace, so it's cached in epic_namespace_slug and only re-fetched when a
// namespace is missing, guarded by sync_state so concurrent cache-misses
// don't all trigger a fresh bulk download.

import { createServiceClient } from "@/utils/supabase/service"
import { fetchProductMapping } from "@/lib/epic/store-api"

const SYNC_STATE_KEY = "epic_namespace_slug_refresh"
const REFRESH_GUARD_HOURS = 6
const UPSERT_CHUNK = 500

type SupabaseServiceClient = ReturnType<typeof createServiceClient>

async function canRefreshMapping(supabase: SupabaseServiceClient): Promise<boolean> {
  const { data } = await supabase.from("sync_state").select("last_run_at").eq("key", SYNC_STATE_KEY).maybeSingle()

  const lastRunAt = data?.last_run_at ? new Date(data.last_run_at).getTime() : 0
  const guardExpired = Date.now() - lastRunAt > REFRESH_GUARD_HOURS * 60 * 60 * 1000

  if (!guardExpired) {
    return false
  }

  await supabase.from("sync_state").upsert({ key: SYNC_STATE_KEY, last_run_at: new Date().toISOString() })
  return true
}

async function refreshMapping(supabase: SupabaseServiceClient): Promise<Record<string, string>> {
  const mapping = await fetchProductMapping()
  const rows = Object.entries(mapping).map(([namespace, slug]) => ({
    namespace,
    slug,
    updated_at: new Date().toISOString(),
  }))

  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const { error } = await supabase.from("epic_namespace_slug").upsert(rows.slice(i, i + UPSERT_CHUNK))
    if (error) {
      console.error("[epic/namespace-slug] bulk upsert batch failed", error)
    }
  }

  return mapping
}

// Resolves slugs for a batch of namespaces in one go — refreshes the full
// bulk mapping at most once per call, only if something is actually missing.
export async function resolveSlugsForNamespaces(namespaces: string[]): Promise<Record<string, string>> {
  if (namespaces.length === 0) {
    return {}
  }

  const supabase = createServiceClient()
  const { data } = await supabase.from("epic_namespace_slug").select("namespace, slug").in("namespace", namespaces)

  const resolved: Record<string, string> = {}
  for (const row of data ?? []) {
    resolved[row.namespace] = row.slug
  }

  const missing = namespaces.filter((namespace) => !resolved[namespace])
  if (missing.length === 0) {
    return resolved
  }

  if (!(await canRefreshMapping(supabase))) {
    // Already refreshed recently and these namespaces still don't map to a
    // slug — likely DLC/non-product entries (see docs/database-design.md
    // section 6). Treat as "no slug" for this request.
    return resolved
  }

  const mapping = await refreshMapping(supabase)
  for (const namespace of missing) {
    if (mapping[namespace]) {
      resolved[namespace] = mapping[namespace]
    }
  }

  return resolved
}
