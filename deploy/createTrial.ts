// createTrial.ts

import { Account, utils } from "near-api-js";
import { TrialData } from "./types";
import { sendTransaction } from "./utils";

function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => toSnakeCase(item));
  } else if (obj && typeof obj === "object" && obj.constructor === Object) {
    return Object.keys(obj).reduce((acc: any, key: string) => {
      const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      acc[snakeKey] = toSnakeCase(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

export async function createTrial(
  signerAccount: Account,
  contractAccountId: string,
  trialData: TrialData,
): Promise<number> {
  console.log("Creating trial...");

  // Convert camelCase trialData to snake_case, including nested objects
  trialData.initialDeposit = utils.format.formatNearAmount(
    trialData.initialDeposit,
  );
  const snakeCaseArgs = toSnakeCase(trialData);

  const result = await sendTransaction({
    signerAccount,
    receiverId: contractAccountId,
    methodName: "create_trial",
    args: snakeCaseArgs,
    deposit: "0",
    gas: "300000000000000",
  });

  const trialId = (result.status as any).SuccessValue
    ? parseInt(
        Buffer.from((result.status as any).SuccessValue, "base64").toString(),
      )
    : null;

  console.log(`Trial created with ID: ${trialId}`);
  if (!trialId) {
    throw new Error("Failed to create trial");
  }
  return trialId;
}
