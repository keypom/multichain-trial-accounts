import { CreationConfig, PremadeTicketData } from "../types";

export const GLOBAL_NETWORK = "testnet";

export const SIGNER_ACCOUNT = "benjiman.testnet";
export const CLEANUP_CONTRACT = false;
export const CREATION_CONFIG: CreationConfig = {
  deployContract: true,

  // TICKETS
  addTickets: true,
  premadeTickets: true,

  // ACCOUNTS
  createSponsors: true,
  createWorker: true,
  createAdmin: true,

  nftDrops: true,
  tokenDrops: true,
  scavDrops: true,
  multichainDrops: true,
};
export const NUM_TICKETS_TO_ADD = 10;

export const TICKET_URL_BASE =
  "https://2930bf5d.keypom-redacted-app.pages.dev/tickets/ticket/ga_pass#";
export const EXISTING_FACTORY = `1727968438229-factory.testnet`;
export const ADMIN_ACCOUNTS = [SIGNER_ACCOUNT];

export const PREMADE_TICKET_DATA: PremadeTicketData = [
  {
    name: "Jake",
    email: "",
  },
  {
    name: "Kiana",
    email: "foo",
  },
  {
    name: "Min",
    email: "foo",
  },
  {
    name: "Benji",
    email: "foo",
  },
  {
    name: "David",
    email: "foo",
  },
];
