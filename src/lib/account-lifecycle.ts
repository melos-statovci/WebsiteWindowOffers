export type AccountStatus = "active" | "suspended";
export type CommercialAccess = "trial" | "active";
export type EffectiveCommercialAccess = CommercialAccess | "trial_expired" | "account_not_ready";
export type AccountUnavailableReason = "SUSPENDED" | "ACCOUNT_NOT_READY" | "TRIAL_EXPIRED";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function effectiveCommercialAccess(input: {
  commercialAccess: CommercialAccess;
  trialEndsAt: Date | null;
  now: Date;
}): EffectiveCommercialAccess {
  if (input.commercialAccess === "active") return "active";
  if (!input.trialEndsAt) return "trial_expired";
  return input.now.getTime() < input.trialEndsAt.getTime() ? "trial" : "trial_expired";
}

export function trialDaysRemaining(input: { trialEndsAt: Date | null; now: Date }): number {
  if (!input.trialEndsAt) return 0;
  return Math.max(0, Math.ceil((input.trialEndsAt.getTime() - input.now.getTime()) / MS_PER_DAY));
}

/**
 * One canonical availability decision for tenant business access and raw
 * organization mutations. Provider authorization is evaluated separately.
 */
export function accountUnavailableReason(input: {
  accountReady: boolean;
  status: AccountStatus;
  effectiveCommercialAccess: EffectiveCommercialAccess;
}): AccountUnavailableReason | null {
  if (input.status === "suspended") return "SUSPENDED";
  if (!input.accountReady) return "ACCOUNT_NOT_READY";
  if (input.effectiveCommercialAccess === "trial_expired") return "TRIAL_EXPIRED";
  return null;
}

export function commercialAccessLabel(access: EffectiveCommercialAccess): string {
  switch (access) {
    case "active":
      return "Active";
    case "trial":
      return "Trial";
    case "trial_expired":
      return "Trial Expired";
    case "account_not_ready":
      return "Account Not Ready";
  }
}
