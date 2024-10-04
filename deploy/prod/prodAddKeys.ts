import { addTickets } from "./addTickets";
import { initNear } from "./utils";
import fs from "fs";
import path from "path";
import { EXISTING_FACTORY, SIGNER_ACCOUNT } from "./config";

const main = async () => {
  const near = await initNear();
  console.log("Connected to Near: ", near);

  const signerAccount = await near.account(SIGNER_ACCOUNT);

  // Ensure the "data" directory exists, create it if it doesn't
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  // STEP 1: Read the current mailing list JSON file
  const mailingListPath = path.join(
    __dirname,
    "toRead",
    "mailinglist-current.json",
  );
  const mailingList = JSON.parse(fs.readFileSync(mailingListPath, "utf-8"));

  // STEP 2: Convert mailing list to an array of objects with only `name` and `email` fields
  const attendeeInfo = mailingList.map((entry: any) => ({
    name: entry.name,
    email: entry.email,
  }));

  // STEP 3: Add tickets and get the keyPair map
  const keyPairMap = await addTickets({
    signerAccount,
    factoryAccountId: EXISTING_FACTORY,
    dropId: "ga_pass",
    attendeeInfo,
  });

  // Prepare to capture failed tickets
  const failedTickets: Array<Record<string, string>> = [];

  // STEP 4: Modify the original mailing list by adding `secretKey` field
  const updatedMailingList = mailingList.map((entry: any) => {
    // Find the keyPair in the keyPairMap that matches the entry
    let ticketData = "NO-DATA-FOUND";

    // Loop through the keyPairMap to find the correct key for this entry
    keyPairMap.forEach((value, key) => {
      if (value.email === entry.email) {
        ticketData = key; // Set the secretKey if emails match
      }
    });

    // If no ticketData was found, log it as a failed ticket
    if (ticketData === "NO-DATA-FOUND") {
      console.error(`Failed to find ticket data for: ${entry.email}`);
      failedTickets.push(entry); // Add to the list of failed tickets
    }

    // Return the updated entry with the added secretKey
    return {
      ...entry,
      merge_fields: {
        ...entry.merge_fields,
        KEY: ticketData,
      },
    };
  });

  // STEP 5: Write the updated mailing list with keys to a new file
  const updatedMailingListPath = path.join(
    __dirname,
    "toRead",
    "mailinglist-with-keys.json",
  );
  fs.writeFileSync(
    updatedMailingListPath,
    JSON.stringify(updatedMailingList, null, 2),
  );

  console.log("Updated mailing list written to mailinglist-with-keys.json");

  // STEP 6: Write failed tickets to a separate file if there are any
  if (failedTickets.length > 0) {
    const failedTicketsPath = path.join(
      __dirname,
      "toRead",
      "failed-tickets.json",
    );
    fs.writeFileSync(failedTicketsPath, JSON.stringify(failedTickets, null, 2));
    console.log(`Failed tickets written to ${failedTicketsPath}`);
  } else {
    console.log("No failed tickets.");
  }
};

main().catch(console.error);
