import {
  ID,
  ObjectType,
  GraphQLISODateTime,
  Field,
  Int,
} from '@nestjs/graphql';
import { Price } from './Price.dto';
import { Owner } from './Owner.dto';
import { Account } from '../../accounts/models';
import { Auction } from '../../auctions/models';
import { NftTypeEnum } from './NftTypes.enum';
import { Metadata } from './Metadata.dto';
import { Nft } from 'src/common/services/elrond-communication/models/nft.dto';

@ObjectType()
export class Asset {
  @Field(() => ID)
  collection!: string;
  @Field(() => Int)
  nonce!: number;
  @Field(() => NftTypeEnum)
  type: NftTypeEnum;
  @Field(() => String)
  identifier!: string;
  @Field(() => Price, { nullable: true })
  lastSalePrice: Price = null;
  @Field({ nullable: true })
  hash: string;
  @Field(() => String)
  creatorAddress: string;
  @Field(() => Account)
  creator: Account = null;
  @Field(() => [Account], { nullable: true })
  owners: Account[];
  @Field(() => [Owner], { nullable: true })
  previousOwners: Owner[];
  @Field()
  name!: string;
  @Field()
  royalties: string;
  @Field(() => String)
  attributes: string;
  @Field(() => String, { nullable: true })
  balance: string;
  @Field(() => GraphQLISODateTime)
  lastSale: Date;
  @Field(() => String)
  creationDate!: string;
  @Field(() => [String], { nullable: false })
  uris: string[];
  @Field(() => Auction, { nullable: true })
  auction: Auction;
  @Field(() => [String], { nullable: true })
  tags: string[];
  @Field(() => Int)
  likesCount: number;
  @Field(() => Boolean, { nullable: true })
  isLiked: boolean;
  @Field(() => Metadata, { nullable: true })
  metadata: Metadata;

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
          owners: nft.owners?.map((account) => Account.fromApiAccount(account)),
          attributes: nft.attributes ?? '',
          lastSale: new Date(),
          creationDate: nft.timestamp,
          hash: nft.hash ?? '',
          balance: nft.balance,
          name: nft.name,
          royalties: nft.royalties ?? '',
          uris: nft.uris || [''],
          metadata: Metadata.fromNftMetadata(nft.metadata),
        })
      : null;
  }
}
