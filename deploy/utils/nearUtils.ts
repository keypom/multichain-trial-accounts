import { Near } from "@near-js/wallet-account";

/**
 * Initializes a NEAR connection using the provided configuration.
 *
 * @param config - The configuration object containing network ID, key store, etc.
 * @returns A Promise that resolves to a Near instance.
 */
export async function initNear(config: any): Promise<Near> {
  const nearConfig = {
    networkId: config.networkId,
    nodeUrl: `https://rpc.${config.networkId}.near.org`,
    keyStore: config.keyStore,
  };
  const near = new Near(nearConfig);
  return near;
}
