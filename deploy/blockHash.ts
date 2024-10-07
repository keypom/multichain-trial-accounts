import bs58 from "bs58"; // Base58 encoding/decoding library

export class BlockHash {
  public data: Uint8Array;

  // Constructor for BlockHash
  constructor(data: Uint8Array) {
    if (data.length !== 32) {
      throw new Error("Invalid BlockHash length. Must be 32 bytes.");
    }
    this.data = data;
  }

  // Create a BlockHash from a base58 string
  static fromBase58(value: string): BlockHash {
    const bytes = bs58.decode(value);
    if (bytes.length !== 32) {
      throw new Error(
        "Invalid BlockHash length from Base58. Must be 32 bytes.",
      );
    }
    return new BlockHash(new Uint8Array(bytes));
  }

  // Create a BlockHash from an array of bytes
  static fromBytes(value: number[]): BlockHash {
    if (value.length !== 32) {
      throw new Error("Invalid BlockHash length. Must be 32 bytes.");
    }
    return new BlockHash(new Uint8Array(value));
  }

  // Serialize to base58 string
  toBase58(): string {
    return bs58.encode(this.data);
  }

  // Convert BlockHash to an array of bytes
  toBytes(): number[] {
    return Array.from(this.data);
  }

  // Serialize the BlockHash to JSON
  toJSON(): string {
    return JSON.stringify(this.toBytes());
  }

  // Deserialize from JSON
  static fromJSON(json: string): BlockHash {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed) || parsed.length !== 32) {
      throw new Error("Invalid JSON for BlockHash. Must be 32 bytes.");
    }
    return BlockHash.fromBytes(parsed);
  }

  // Example test for zero block hash
  static zero(): BlockHash {
    return new BlockHash(new Uint8Array(32)); // 32 bytes of 0
  }
}
