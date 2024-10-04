import { sendTransaction } from "./utils";
import { KeyPair } from "near-api-js";
import { Config, PremadeTicket, PremadeTicketData } from "./types";

// Utility function to base64 encode a JSON object
const encodeToBase64 = (jsonObject: Record<string, any>) => {
  const jsonString = JSON.stringify(jsonObject);
  return Buffer.from(jsonString).toString("base64");
};

// Utility function to decode base64 and parse JSON
const decodeAndParseBase64 = (base64String: string) => {
  // Step 1: Decode the base64 string to get the JSON string
  const jsonString = Buffer.from(base64String, "base64").toString("utf-8");

  // Step 2: Parse the JSON string to get back the original object
  const jsonObject = JSON.parse(jsonString);

  // Step 3: Return the parsed object
  return jsonObject;
};

export const addTickets = async ({
  signerAccount,
  factoryAccountId,
  dropId,
  attendeeInfo,
  encodeTickets = true,
}: {
  signerAccount: any;
  factoryAccountId: string;
  dropId: string;
  attendeeInfo: Array<Record<string, string>>;
  encodeTickets?: boolean;
}) => {
  // Map to store the KeyPair -> Attendee Info relationship
  const keyPairMap: Map<string, Record<string, string>> = new Map();

  for (let i = 0; i < attendeeInfo.length; i += 50) {
    let keyData: Array<Record<string, any>> = [];

    for (let j = i; j < i + 50; j++) {
      const curInfo = attendeeInfo[j];
      if (curInfo) {
        const keyPair = KeyPair.fromRandom("ed25519");

        // Instead of encrypting, create a base64-encoded JSON object
        const jsonObject = {
          ticket: keyPair.toString(), // Private key of the ticket
          userData: curInfo, // Attendee's data
        };

        keyData.push({
          public_key: keyPair.getPublicKey().toString(),
          metadata: "", // Store base64-encoded JSON
        });

        if (encodeTickets) {
          const encodedJson = encodeToBase64(jsonObject); // Encode to base64
          keyPairMap.set(encodedJson, curInfo);
        } else {
          keyPairMap.set(keyPair.toString(), curInfo);
        }
      }
    }

    // Send the transaction in batches of 50 tickets
    await sendTransaction({
      signerAccount,
      receiverId: factoryAccountId,
      methodName: "add_tickets",
      args: {
        drop_id: dropId,
        key_data: keyData,
      },
      deposit: "0",
      gas: "300000000000000", // Set gas limit
    });
  }

  // Return the map of key pairs to attendee info
  return keyPairMap;
};

export const addPremadeTickets = async ({
  factoryAccountId,
  dropId,
  near,
  signerAccount,
  attendeeInfo,
  config,
}: {
  config: Config;
  signerAccount: any;
  near: any;
  factoryAccountId: string;
  dropId: string;
  attendeeInfo: PremadeTicketData;
}) => {
  // Map to store the KeyPair -> Attendee Info relationship
  const keyPairMap: Map<string, PremadeTicket> = new Map();

  for (let i = 0; i < attendeeInfo.length; i += 50) {
    let keyData: Array<Record<string, any>> = [];

    for (let j = i; j < i + 50; j++) {
      const curInfo = attendeeInfo[j];
      if (curInfo) {
        const keyPair = KeyPair.fromRandom("ed25519");

        // Instead of encrypting, create a base64-encoded JSON object
        const jsonObject = {
          ticket: keyPair.toString(), // Private key of the ticket
          userData: curInfo, // Attendee's data
        };

        keyData.push({
          public_key: keyPair.getPublicKey().toString(),
          metadata: "", // Store base64-encoded JSON
        });

        const encodedJson = encodeToBase64(jsonObject); // Encode to base64
        // Map the keypair's public key to the corresponding attendee info
        keyPairMap.set(encodedJson, curInfo);
      }
    }

    // Send the transaction in batches of 50 tickets
    await sendTransaction({
      signerAccount,
      receiverId: factoryAccountId,
      methodName: "add_tickets",
      args: {
        drop_id: dropId,
        key_data: keyData,
      },
      deposit: "0",
      gas: "300000000000000", // Set gas limit
    });
  }

  const premadeCSV: string[] = [];
  for (const [key, value] of keyPairMap) {
    const { ticket, userData } = decodeAndParseBase64(key);
    const keyPair = KeyPair.fromString(ticket);
    await near.config.keyStore.setKey(
      config.GLOBAL_NETWORK,
      factoryAccountId,
      keyPair,
    );
    const factoryAccount = await near.account(factoryAccountId);
    await sendTransaction({
      signerAccount: factoryAccount,
      receiverId: factoryAccountId,
      methodName: "scan_ticket",
      args: {},
      deposit: "0",
      gas: "300000000000000", // Set gas limit
    });

    await sendTransaction({
      signerAccount: factoryAccount,
      receiverId: factoryAccountId,
      methodName: "create_account",
      args: {
        new_account_id: `${value.name.toLowerCase()}.${factoryAccountId}`,
      },
      deposit: "0",
      gas: "300000000000000", // Set gas limit
    });

    // Push the URL into the premade CSV array
    premadeCSV.push(`${userData.name}, ${config.TICKET_URL_BASE}${key}`);
  }

  return premadeCSV;
};
