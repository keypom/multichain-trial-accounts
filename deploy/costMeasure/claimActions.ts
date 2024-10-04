import { Account } from "near-api-js";
import { sendTransaction } from "../utils";

// Claim a drop (generic function)
export async function claimDrop(
  signerAccount: Account,
  dropId: string,
  signatureData: { signature: string; publicKey: string },
  factoryAccountId: string,
  scavengerId: string | null = null,
) {
  await sendTransaction({
    signerAccount,
    receiverId: factoryAccountId,
    methodName: "claim_drop",
    args: {
      drop_id: dropId,
      scavenger_id: scavengerId,
      signature: signatureData.signature,
    },
    deposit: "0",
    gas: "300000000000000",
  });
}
