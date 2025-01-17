import { registerEnumType } from '@nestjs/graphql';

export enum AuctionTypeEnum {
  None = 'None',
  Nft = 'Nft',
  NftBid = 'NftBid',
  SftAll = 'SftAll',
  SftOnePerPayment = 'SftOnePerPayment',
}

export enum ElrondSwapAuctionTypeEnum {
  Auction,
  Swap,
  Buy,
}

registerEnumType(AuctionTypeEnum, {
  name: 'AuctionTypeEnum',
});
