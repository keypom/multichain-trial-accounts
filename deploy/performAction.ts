import { Account, utils } from "near-api-js";
import { sendTransaction } from "./utils";
import { ActionToPerform } from "./types";

export async function performAction(
  signerAccount: Account,
  contractAccountId: string,
  actionToPerform: ActionToPerform,
): Promise<void> {
  const { targetContractId, methodName, args, gas, attachedDepositNear } =
    actionToPerform;
  console.log(
    `Performing action: ${methodName} on contract: ${targetContractId}`,
  );

  // Serialize the method arguments into a byte array
  const serializedArgs = Buffer.from(JSON.stringify(args));

  // Call the perform_action method on the contract
  const result = await sendTransaction({
    signerAccount,
    receiverId: contractAccountId,
    methodName: "perform_action",
    args: {
      contract_id: targetContractId,
      method_name: methodName,
      args: serializedArgs,
      gas,
      deposit: utils.format.parseNearAmount(attachedDepositNear),
    },
    deposit: "0", // Attach 0 NEAR to perform this action
    gas, // Pass the gas amount to the transaction
  });

  if (result) {
    console.log(
      `Action ${methodName} performed successfully on ${targetContractId}`,
    );
  } else {
    throw new Error(`Failed to perform action: ${methodName}`);
  }
}
