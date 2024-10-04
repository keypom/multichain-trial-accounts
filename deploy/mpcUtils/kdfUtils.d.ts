// kdfUtils.d.ts

export function najPublicKeyStrToUncompressedHexPoint(): string;

export function deriveChildPublicKey(
  parentUncompressedPublicKeyHex: string,
  signerId: string,
  path?: string,
): Promise<string>;

export function uncompressedHexPointToEvmAddress(
  uncompressedHexPoint: string,
): string;

export function uncompressedHexPointToBtcAddress(
  publicKeyHex: string,
  network: string,
): Promise<string>;
