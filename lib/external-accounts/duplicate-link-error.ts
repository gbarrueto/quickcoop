// external_accounts has unique(provider, provider_account_id) — a Steam/Epic
// account can only ever be linked to one qcoop user. Upserts that target a
// different user's existing link hit that constraint (Postgres unique
// violation, code 23505); this turns it into a friendly, user-facing error
// instead of a raw DB error. See docs/anonymous-first-flow-plan.md section 6b.

export class DuplicateAccountLinkError extends Error {
  constructor(provider: string) {
    super(`This ${provider} account is already linked to another QuickCoop user.`)
    this.name = "DuplicateAccountLinkError"
  }
}

export function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505"
}
