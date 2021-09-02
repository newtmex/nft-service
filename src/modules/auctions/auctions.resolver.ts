import {
  Resolver,
  Query,
  Args,
  ResolveField,
  Parent,
  Mutation,
  Int,
  Context,
  GraphQLISODateTime,
} from '@nestjs/graphql';
import { AuctionsService } from './auctions.service';
import { BaseResolver } from '../base.resolver';
import { Account } from '../accounts/models/Account.dto';
import {
  Auction,
  CreateAuctionArgs,
  BidActionArgs,
  BuySftActionArgs,
  AuctionTypeEnum,
  AuctionStatusEnum,
} from './models';
import { AssetsService } from '../assets/assets.service';
import { elrondConfig } from 'src/config';
import { NftMarketplaceAbiService } from './nft-marketplace.abi.service';
import { TransactionNode } from '../transaction';
import { Asset } from '../assets/models/Asset.dto';
import { Order } from '../orders/models/Order.dto';
import { Price } from '../assets/models';
import AuctionResponse from './models/AuctionResonse';
import { connectionFromArraySlice } from 'graphql-relay';
import ConnectionArgs from '../ConnectionArgs';
import { FiltersExpression, Sorting } from '../filtersTypes';
import { IGraphQLContext } from 'src/db/auctions/graphql.types';
import { QueryRequest, TrendingQueryRequest } from '../QueryRequest';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/gql.auth-guard';
import { User } from '../user';
import { AccountsProvider } from '../accounts/accounts.loader';
import { OrdersProvider } from 'src/db/orders/orders.loader';

@Resolver(() => Auction)
export class AuctionsResolver extends BaseResolver(Auction) {
  constructor(
    private auctionsService: AuctionsService,
    private nftAbiService: NftMarketplaceAbiService,
    private assetsService: AssetsService,
    private accountsProvider: AccountsProvider,
    private ordersProvider: OrdersProvider,
  ) {
    super();
  }

  @Mutation(() => TransactionNode)
  // @UseGuards(GqlAuthGuard)
  async createAuction(
    @Args('input') input: CreateAuctionArgs,
    // @User() user: any,
  ): Promise<TransactionNode> {
    return await this.nftAbiService.createAuction(
      'erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th',
      input,
    );
  }

  @Mutation(() => TransactionNode)
  @UseGuards(GqlAuthGuard)
  async endAuction(
    @Args({ name: 'auctionId', type: () => Int }) auctionId: number,
    @User() user: any,
  ): Promise<TransactionNode> {
    return await this.nftAbiService.endAuction(user.publicKey, auctionId);
  }

  @Mutation(() => TransactionNode)
  @UseGuards(GqlAuthGuard)
  async bid(
    @Args('input') input: BidActionArgs,
    @User() user: any,
  ): Promise<TransactionNode> {
    return await this.nftAbiService.bid(user.publicKey, input);
  }

  @Mutation(() => TransactionNode)
  @UseGuards(GqlAuthGuard)
  async buySft(
    @Args('input') input: BuySftActionArgs,
    @User() user: any,
  ): Promise<TransactionNode> {
    return await this.nftAbiService.buySft(user.publicKey, input);
  }

  @Mutation(() => TransactionNode)
  @UseGuards(GqlAuthGuard)
  async withdraw(
    @Args({ name: 'auctionId', type: () => Int }) auctionId: number,
    @User() user: any,
  ): Promise<TransactionNode> {
    return await this.nftAbiService.withdraw(user.publicKey, auctionId);
  }

  @Query(() => AuctionResponse)
  async auctions(
    @Args({ name: 'filters', type: () => FiltersExpression, nullable: true })
    filters,
    @Args({ name: 'sorting', type: () => [Sorting], nullable: true })
    sorting,
    @Args({ name: 'pagination', type: () => ConnectionArgs, nullable: true })
    pagination: ConnectionArgs,
  ) {
    const { limit, offset } = pagination.pagingParams();
    const [auctions, count] = await this.auctionsService.getAuctions(
      new QueryRequest({ limit, offset, filters, sorting }),
    );
    const page = connectionFromArraySlice(auctions, pagination, {
      arrayLength: count,
      sliceStart: offset || 0,
    });
    return {
      edges: page.edges,
      pageInfo: page.pageInfo,
      pageData: { count, limit, offset },
    };
  }

  @Query(() => AuctionResponse)
  async auctionsSortByBids(
    @Args({ name: 'filters', type: () => FiltersExpression, nullable: true })
    filters,
    @Args({ name: 'pagination', type: () => ConnectionArgs, nullable: true })
    pagination: ConnectionArgs,
  ) {
    const { limit, offset } = pagination.pagingParams();
    const [auctions, count] = await this.auctionsService.getAuctions(
      new QueryRequest({ limit, offset, filters }),
    );
    const page = connectionFromArraySlice(auctions, pagination, {
      arrayLength: count,
      sliceStart: offset || 0,
    });
    return {
      edges: page.edges,
      pageInfo: page.pageInfo,
      pageData: { count, limit, offset },
    };
  }

  @Query(() => AuctionResponse)
  async trendingAuctions(
    @Args({ name: 'startDate', type: () => GraphQLISODateTime })
    startDate,
    @Args({ name: 'endDate', type: () => GraphQLISODateTime })
    endDate,

    @Args({ name: 'pagination', type: () => ConnectionArgs, nullable: true })
    pagination: ConnectionArgs,
  ) {
    const { limit, offset } = pagination.pagingParams();
    const [auctions, count] = await this.auctionsService.getTrendingAuctions(
      new TrendingQueryRequest({ limit, offset, startDate, endDate }),
    );
    const page = connectionFromArraySlice(auctions, pagination, {
      arrayLength: count,
      sliceStart: offset || 0,
    });
    return {
      edges: page.edges,
      pageInfo: page.pageInfo,
      pageData: { count, limit, offset },
    };
  }

  @ResolveField('asset', () => Asset)
  async asset(@Parent() auction: Auction) {
    const { identifier, status } = auction;
    return status !== AuctionStatusEnum.Closed &&
      status !== AuctionStatusEnum.Ended
      ? await this.assetsService.getAssetByIdentifierAndAddress(
          elrondConfig.nftMarketplaceAddress,
          identifier,
        )
      : await this.assetsService.getAssetByIdentifier(identifier);
  }

  @ResolveField('topBid', () => Price)
  async topBid(@Parent() auction: Auction) {
    const { id } = auction;
    const activeOrders = await this.ordersProvider.getOrderByAuctionId(id);

    return activeOrders?.length > 0
      ? Price.fromEntity(activeOrders[activeOrders.length - 1])
      : null;
  }

  @ResolveField('topBidder', () => Account)
  async topBidder(@Parent() auction: Auction) {
    const { id } = auction;

    const activeOrders = await this.ordersProvider.getOrderByAuctionId(id);
    return activeOrders?.length > 0
      ? Account.fromEntity(
          await this.accountsProvider.getAccountByAddress(
            activeOrders[activeOrders.length - 1].ownerAddress,
          ),
          activeOrders[activeOrders.length - 1].ownerAddress,
        )
      : null;
  }

  @ResolveField('availableTokens', () => Int)
  async availableTokens(@Parent() auction: Auction) {
    const { id, nrAuctionedTokens, type } = auction;
    if (type === AuctionTypeEnum.SftOnePerPayment) {
      const orders = await this.ordersProvider.getOrderByAuctionId(id);
      const availableTokens =
        nrAuctionedTokens - orders?.length || nrAuctionedTokens;
      return availableTokens;
    }
    return nrAuctionedTokens;
  }

  @ResolveField('orders', () => [Order])
  async orders(
    @Parent() auction: Auction,
    @Context()
    { auctionOrdersLoader: auctionOrdersLoader }: IGraphQLContext,
  ) {
    const { id } = auction;

    if (!id) return null;
    const orderEntities = await auctionOrdersLoader.load(id);
    return orderEntities?.map((element) => Order.fromEntity(element));
  }

  @ResolveField('owner', () => Account)
  async owner(@Parent() auction: Auction) {
    const { ownerAddress } = auction;

    if (!ownerAddress) return null;
    const account = await this.accountsProvider.getAccountByAddress(
      ownerAddress,
    );
    return Account.fromEntity(account, ownerAddress);
  }
}
