import { KeyPair } from "near-api-js";
import { sendTransaction } from "../utils";
import { GLOBAL_NETWORK } from "./config";

// Scan tickets
export async function scanTickets(
  near: any,
  ticketKeys: string[],
  factoryAccountId: string,
) {
  const keyStore = near.connection.signer.keyStore;

  for (const ticketKey of ticketKeys) {
    // Switch signer to User Account
    const signerAccount = await near.account(factoryAccountId);
    const ticketKeyPair = KeyPair.fromString(ticketKey);
    await keyStore.setKey(GLOBAL_NETWORK, factoryAccountId, ticketKeyPair);

    await sendTransaction({
      signerAccount,
      receiverId: factoryAccountId,
      methodName: "scan_ticket",
      args: {},
      deposit: "0",
      gas: "300000000000000",
    });
  }
}
