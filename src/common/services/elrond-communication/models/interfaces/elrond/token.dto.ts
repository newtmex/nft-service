export interface Token {
  token: string;
  name: string;
  type: string;
  owner: string;
  minted: string;
  burnt: string;
  decimals: number;
  isPaused: boolean;
  canUpgrade: boolean;
  canMint: boolean;
  canBurn: boolean;
  canChangeOwner: boolean;
  canPause: boolean;
  canFreeze: boolean;
  canWipe: boolean;
  canAddSpecialRoles: boolean;
  canTransferNFTCreateRole: boolean;
  wiped: string;
  tokenIdentifier: string;
  attributes: string;
  balance: string;
  creator: string;
  hash: string;
  nonce: number;
  royalties: string;
  uris: string[];
}
