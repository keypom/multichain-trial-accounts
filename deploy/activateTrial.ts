import { sendTransaction } from "./utils";
import { Account } from "@near-js/accounts";

export async function activateTrial(
  signerAccount: Account,
  contractAccountId: string,
  newAccountId: string,
): Promise<void> {
  console.log(`Activating trial for account: ${newAccountId}...`);

  // Call the `activate_trial` function using `sendTransaction`
  const result = await sendTransaction({
    signerAccount: signerAccount,
    receiverId: contractAccountId,
    methodName: "activate_trial",
    args: {
      new_account_id: newAccountId,
    },
    deposit: "0", // No deposit needed in this case
    gas: "300000000000000", // Adjust gas as needed
  });

  if (result) {
    console.log(`Trial successfully activated for account: ${newAccountId}.`);
  } else {
    throw new Error("Failed to activate trial");
  }
}
