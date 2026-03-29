/**
 * Compteurs HTTP externes — activés uniquement si `VERIFICATION_SCRIPT=1`
 * (script `scripts/verify-integration.ts`).
 */
let fragantyHttpFetchCount = 0;
let genericExternalHttpFetchCount = 0;

export function resetPerfumeSearchInstrumentation(): void {
  fragantyHttpFetchCount = 0;
  genericExternalHttpFetchCount = 0;
}

export function recordFragantyHttpFetch(): void {
  if (process.env.VERIFICATION_SCRIPT === "1") {
    fragantyHttpFetchCount += 1;
  }
}

export function recordGenericExternalHttpFetch(): void {
  if (process.env.VERIFICATION_SCRIPT === "1") {
    genericExternalHttpFetchCount += 1;
  }
}

export function getPerfumeSearchInstrumentation(): {
  fragantyHttpFetches: number;
  genericExternalHttpFetches: number;
} {
  return {
    fragantyHttpFetches: fragantyHttpFetchCount,
    genericExternalHttpFetches: genericExternalHttpFetchCount,
  };
}
