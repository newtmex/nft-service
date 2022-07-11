import {
  Resolver,
  Args,
  Query,
  ResolveField,
  Parent,
  Int,
} from '@nestjs/graphql';
import { BaseResolver } from '../common/base.resolver';
import { Collection, CollectionAsset } from './models';
import { CollectionsService } from './collection.service';
import CollectionResponse from './models/CollectionResponse';
import { AccountsProvider } from '../account-stats/loaders/accounts.loader';
import { Account } from '../account-stats/models';
import { CollectionsFilter } from '../common/filters/filtersTypes';
import ConnectionArgs from '../common/filters/ConnectionArgs';
import PageResponse from '../common/PageResponse';
import { AuctionsForCollectionProvider } from './loaders/collection-auctions.loader';

@Resolver(() => Collection)
export class CollectionsQueriesResolver extends BaseResolver(Collection) {
  constructor(
    private collectionsService: CollectionsService,
    private accountsProvider: AccountsProvider,
    private activeAuctionsProvider: AuctionsForCollectionProvider,
  ) {
    super();
  }

  @Query(() => CollectionResponse)
  async collections(
    @Args({ name: 'filters', type: () => CollectionsFilter, nullable: true })
    filters: CollectionsFilter,
    @Args({ name: 'pagination', type: () => ConnectionArgs, nullable: true })
    pagination: ConnectionArgs,
  ): Promise<CollectionResponse> {
    const { limit, offset } = pagination.pagingParams();
    const [collections, count] = await this.collectionsService.getCollections(
      offset,
      limit,
      filters,
    );

    return PageResponse.mapResponse<Collection>(
      collections || [],
      pagination,
      count || 0,
      offset,
      limit,
    );
  }

  @ResolveField('owner', () => Account)
  async owner(@Parent() auction: Collection) {
    const { ownerAddress } = auction;

    if (!ownerAddress) return null;
    const account = await this.accountsProvider.load(ownerAddress);
    return Account.fromEntity(account?.value ?? null, ownerAddress);
  }

  @ResolveField('activeAuctions', () => Int)
  async activeAuctions(@Parent() node: Collection) {
    const { collection } = node;

    if (!collection) return 0;
    const activeAuctions = await this.activeAuctionsProvider.load(collection);
    return activeAuctions?.value?.Count ?? 0;
  }

  @ResolveField('collectionAsset', () => CollectionAsset)
  async collectionAssets(
    @Parent() collectionResponse: Collection,
    @Args('assetsCount', { nullable: true, type: () => Int })
    assetsCount: number = 4,
  ): Promise<CollectionAsset> {
    const { collection, collectionAsset } = collectionResponse;
    if (collectionAsset) return collectionAsset;
    return new CollectionAsset({
      collectionIdentifer: collection,
    });
  }
}