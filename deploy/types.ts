// types.ts

// Define the types for DropData, NFT Metadata, and Multichain Metadata

export interface DropData {
  name: string;
  image: string;
  key?: string;
  scavenger_hunt?: ScavengerHuntPiece[];
}

export interface NFTMetadata {
  title: string;
  description: string;
  media: string;
}

export interface MultichainMetadata {
  chain_id: number;
  contract_id: string;
  series_id: number;
}

// Scavenger Hunt Piece Definition
export interface ScavengerHuntPiece {
  id: number;
  key?: string;
  description: string;
}

// Data types for Token Drop, NFT Drop, and Multichain Drop
export interface TokenDrop {
  drop_data: DropData;
  token_amount: string;
}

export interface NFTDrop {
  drop_data: DropData;
  nft_metadata: NFTMetadata;
}

export interface MultichainDrop {
  drop_data: DropData;
  nft_metadata: NFTMetadata;
  multichain_metadata: MultichainMetadata;
}

// Premade data types for tokens, NFTs, multichain drops, and scavenger hunts
export type PremadeTokenDrops = TokenDrop[];
export type PremadeNFTDrops = NFTDrop[];
export type PremadeMultichainDrops = MultichainDrop[];

// Scavenger Hunt Drop type, which can be either Token-based or NFT-based
export interface ScavengerHuntDrop {
  drop_data: DropData;
  nft_metadata?: NFTMetadata;
  token_amount?: string;
}

export type PremadeScavengerHunts = ScavengerHuntDrop[];

// Sponsor Data
export interface SponsorData {
  accountName: string;
  startingNearBalance: string;
  startingTokenBalance: string;
  accountType: string;
}

export type Sponsors = SponsorData[];

// Ticket Data
export interface TicketData {
  startingNearBalance: string;
  startingTokenBalance: string;
  accountType: string;
}

export interface TicketDataMap {
  [key: string]: TicketData;
}

// Configuration types
export interface CreationConfig {
  deployContract: boolean;
  addTickets: boolean;
  premadeTickets: boolean;
  createSponsors: boolean;
  createWorker: boolean;
  createAdmin: boolean;
  nftDrops: boolean;
  tokenDrops: boolean;
  scavDrops: boolean;
  multichainDrops: boolean;
}

// General configuration interface
export interface Config {
  GLOBAL_NETWORK: string;
  SIGNER_ACCOUNT: string;
  CLEANUP_CONTRACT: boolean;
  CREATION_CONFIG: CreationConfig;
  NUM_TICKETS_TO_ADD: number;
  TICKET_URL_BASE: string;
  EXISTING_FACTORY: string;
  ADMIN_ACCOUNTS: string[];
  PREMADE_TICKET_DATA: PremadeTicketData;
}

// Premade Ticket Data
export interface PremadeTicket {
  name: string;
  email: string;
}

export type PremadeTicketData = PremadeTicket[];
