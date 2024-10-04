// kdf.d.ts

export function getDerivedPublicKeyFromMpc(
  accountId: string,
  derivationPath: string,
): Promise<Buffer>;
