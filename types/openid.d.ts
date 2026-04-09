declare module "openid" {
  export class RelyingParty {
    constructor(
      returnUrl: string,
      realm: string,
      stateless: boolean,
      strict: boolean,
      extensions?: unknown[],
    )

    authenticate(
      identifier: string,
      immediate: boolean,
      callback: (error: Error | null, authUrl?: string) => void,
    ): void

    verifyAssertion(
      requestOrUrl: unknown,
      callback: (error: Error | null, result?: { authenticated?: boolean; claimedIdentifier?: string }) => void,
    ): void
  }
}
