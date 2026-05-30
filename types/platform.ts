/** Platforms used for friend identities and stored connections. */
export type CorePlatform = "steam" | "epic" | "xbox" | "qcoop"

/** All platform sources a game can originate from, including manual imports. */
export type Platform = CorePlatform | "import"

export type CategoryFilterMode = "or" | "and"
