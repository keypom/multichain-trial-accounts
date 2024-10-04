import { Account } from "near-api-js";
import { adminCreateAccount } from "../adminCreateAccounts";
import { addTickets as addTicketsUtil } from "../addTickets";
import { createDrops as createDropsUtil } from "../createDrops";

// Create accounts
export async function createAccount(
  signerAccount: Account,
  factoryAccountId: string,
  accountType: string,
  accountName: string,
): Promise<{ accountId: string; secretKey: string }> {
  const result = await adminCreateAccount({
    signerAccount,
    factoryAccountId,
    newAccountName: accountName,
    startingNearBalance: "0.01",
    startingTokenBalance: accountType === "Sponsor" ? "50" : "0",
    accountType,
  });
  return { accountId: result.accountId, secretKey: result.secretKey };
}

// Add tickets
export async function addTickets(
  signerAccount: Account,
  factoryAccountId: string,
  attendeeInfo: Array<Record<string, string>>,
) {
  const result = await addTicketsUtil({
    signerAccount,
    factoryAccountId,
    dropId: "ga_pass",
    attendeeInfo,
    encodeTickets: false,
  });
  return { ticketKeys: Array.from(result.keys()) };
}

// Add drops
export async function addDrop(
  signerAccount: Account,
  factoryAccountId: string,
  dropType: string,
) {
  const dropConfig: any = {
    signerAccount,
    factoryAccountId,
    drops: [],
  };

  const commonData = {
    drop_data: {
      name: `${dropType} Drop`,
      image: "bafkreihgosptxbojx37vxo4bly5opn5iqx2hmffdmg6ztokjmvtwa36axu",
    },
  };

  switch (dropType) {
    case "Token":
      dropConfig.drops.push({
        ...commonData,
        token_amount: "1",
      });
      break;
    case "NFT":
      dropConfig.drops.push({
        ...commonData,
        nft_metadata: {
          title: "NFT Drop",
          description: "NFT Drop Description",
          media: "bafkreihgosptxbojx37vxo4bly5opn5iqx2hmffdmg6ztokjmvtwa36axu",
        },
      });
      break;
    case "Multichain":
      dropConfig.drops.push({
        ...commonData,
        nft_metadata: {
          title: "Multichain NFT",
          description: "Multichain NFT Description",
          media: "bafkreihgosptxbojx37vxo4bly5opn5iqx2hmffdmg6ztokjmvtwa36axu",
        },
        multichain_metadata: {
          chain_id: 84532,
          contract_id: "0xD6B95F11213cC071B982D717721B1aC7Bc628d46",
          series_id: 1,
        },
      });
      break;
    default:
      throw new Error(`Unknown drop type: ${dropType}`);
  }

  return await createDropsUtil(dropConfig);
}

// Add scavenger hunts
export async function addScavengerHunt(
  signerAccount: Account,
  factoryAccountId: string,
  huntType: string,
  pieces: number,
) {
  const scavengerHunt = Array.from({ length: pieces }, (_, idx) => ({
    id: idx + 1,
    description: `Find this item at location ${idx + 1}`,
  }));

  const commonData = {
    drop_data: {
      name: `Scavenger ${huntType} Hunt`,
      image: "bafkreihgosptxbojx37vxo4bly5opn5iqx2hmffdmg6ztokjmvtwa36axu",
      scavenger_hunt: scavengerHunt,
    },
  };

  const dropConfig: any = {
    signerAccount,
    factoryAccountId,
    drops: [],
  };

  switch (huntType) {
    case "Token":
      dropConfig.drops.push({
        ...commonData,
        token_amount: "1",
      });
      break;
    case "NFT":
      dropConfig.drops.push({
        ...commonData,
        nft_metadata: {
          title: "Scavenger NFT",
          description: "Scavenger NFT Description",
          media: "bafkreihgosptxbojx37vxo4bly5opn5iqx2hmffdmg6ztokjmvtwa36axu",
        },
      });
      break;
    case "Multichain":
      dropConfig.drops.push({
        ...commonData,
        nft_metadata: {
          title: "Scavenger Multichain NFT",
          description: "Scavenger Multichain NFT Description",
          media: "bafkreihgosptxbojx37vxo4bly5opn5iqx2hmffdmg6ztokjmvtwa36axu",
        },
        multichain_metadata: {
          chain_id: 84532,
          contract_id: "0xD6B95F11213cC071B982D717721B1aC7Bc628d46",
          series_id: 1,
        },
      });
      break;
    default:
      throw new Error(`Unknown hunt type: ${huntType}`);
  }

  return await createDropsUtil(dropConfig);
}
