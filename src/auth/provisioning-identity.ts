import { AsyncLocalStorage } from "node:async_hooks";

export interface TrustedProvisioningIdentity {
  applicationId: string;
  ownerUserId: string;
}

const trustedProvisioningIdentity = new AsyncLocalStorage<TrustedProvisioningIdentity>();

export function runWithTrustedProvisioningIdentity<T>(
  identity: TrustedProvisioningIdentity,
  callback: () => Promise<T>,
): Promise<T> {
  return trustedProvisioningIdentity.run(identity, callback);
}

export function getTrustedProvisioningIdentity(): TrustedProvisioningIdentity | undefined {
  return trustedProvisioningIdentity.getStore();
}
