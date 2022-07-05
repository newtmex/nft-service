import { ID, ObjectType, Field, Int } from '@nestjs/graphql';
import { Auction, AuctionResponse } from '../../auctions/models';
import { NftTypeEnum } from './NftTypes.enum';
import { Metadata } from './Metadata.dto';
import { Nft } from 'src/common';
import { ScamInfo } from './ScamInfo.dto';
import { Media } from './Media.dto';
import { Account } from 'src/modules/account-stats/models';
import { FeaturedMarketplace } from './FeaturedMarketplace.dto';
import { Rarity } from './Rarity';

@ObjectType()
export class Asset {
  @Field(() => ID)
  collection!: string;
  @Field(() => Int)
  nonce!: number;
  @Field(() => NftTypeEnum, { nullable: true })
  type: NftTypeEnum;
  @Field(() => String)
  identifier!: string;
  @Field({ nullable: true })
  hash: string;
  @Field(() => String)
  creatorAddress: string;
  @Field(() => Account, { nullable: true })
  creator: Account;
  @Field(() => String, { nullable: true })
  ownerAddress: string;
  @Field(() => Account, { nullable: true })
  owner: Account;
  @Field({ nullable: true })
  name: string;
  @Field()
  royalties: string;
  @Field(() => String)
  attributes: string;
  @Field(() => Boolean)
  isWhitelistedStorage: boolean;
  @Field(() => String, { nullable: true })
  balance: string;
  @Field(() => String, { nullable: true })
  supply: string;
  @Field(() => String, { nullable: true })
  totalRunningAuctions: string;
  @Field(() => String, { nullable: true })
  totalAvailableTokens: string;
  @Field(() => Boolean, { nullable: true })
  hasAvailableAuctions: boolean;
  @Field(() => Int, { nullable: true })
  creationDate!: number;
  @Field(() => [String])
  uris: string[];
  @Field(() => AuctionResponse, {
    nullable: true,
    description: 'This will return only the running query!',
  })
  auctions: AuctionResponse;
  @Field(() => Auction, { nullable: true })
  lowestAuction: Auction;
  @Field(() => [String], { nullable: true })
  tags: string[];
  @Field(() => Int, { nullable: true })
  likesCount: number;
  @Field(() => Int, { nullable: true })
  viewsCount: number;
  @Field(() => Boolean, { nullable: true })
  isLiked: boolean;
  @Field(() => String, {
    nullable: true,
    deprecationReason: 'This field will be removed in the next version',
  })
  url: string;
  @Field(() => String, {
    nullable: true,
    deprecationReason: 'This field will be removed in the next version',
  })
  thumbnailUrl: string;
  @Field(() => Metadata, { nullable: true })
  metadata: Metadata;
  @Field(() => ScamInfo, { nullable: true })
  scamInfo: ScamInfo;
  @Field(() => [Media], { nullable: true })
  media: Media[];
  @Field({ nullable: true })
  verified: boolean;
  @Field({ nullable: true })
  isNsfw: boolean;
  @Field({ nullable: true })
  featuredMarketplace: FeaturedMarketplace;
  @Field(() => Rarity, { nullable: true })
  rarity: Rarity;

  constructor(init?: Partial<Asset>) {
    Object.assign(this, init);
  }

  static fromNft(nft: Nft) {
    return nft
      ? new Asset({
          collection: nft.collection,
          type: NftTypeEnum[nft.type],
          nonce: nft.nonce ?? 0,
          identifier: nft.identifier,
          creatorAddress: nft.creator ?? '',
          ownerAddress: nft.owner,
          attributes: nft.attributes ?? '',
          creationDate: nft.timestamp,
          hash: nft.hash ?? '',
          balance: nft.balance,
          supply: nft.supply,
          name: nft.name,
          royalties: nft.royalties ?? '',
          uris: nft.uris || [''],
          metadata: Metadata.fromNftMetadata(nft.metadata),
          tags: nft.tags,
          isWhitelistedStorage: nft.isWhitelistedStorage,
          isNsfw: nft.isNsfw,
          scamInfo: ScamInfo.fromNftScamInfo(nft.scamInfo),
          media: nft.media?.map((m) => Media.fromNftMedia(m)),
          verified: !!nft.assets ?? false,
        })
      : null;
  }
}
