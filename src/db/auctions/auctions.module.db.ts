import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModuleDb } from '../orders/orders.module.db';
import { AuctionEntity } from '.';
import { AuctionsServiceDb } from './auctions.service.db';
import { AccountsStatsModuleGraph } from 'src/modules/account-stats/accounts-stats.module';
import { AuctionsForAssetRedisHandler } from 'src/modules/auctions';
import { AssetAuctionsCountRedisHandler } from 'src/modules/assets/loaders/asset-auctions-count.redis-handler';
import { LowestAuctionRedisHandler } from 'src/modules/auctions/loaders/lowest-auctions.redis-handler';
import { TagsRepository } from './tags.repository';
import { AssetAvailableTokensCountRedisHandler } from 'src/modules/assets/loaders/asset-available-tokens-count.redis-handler';
import { OnSaleAssetsCountForCollectionRedisHandler } from 'src/modules/nftCollections/loaders/onsale-assets-count.redis-handler';
import { AssetsRedisHandler } from 'src/modules/assets/loaders/assets.redis-handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuctionEntity]),
    TypeOrmModule.forFeature([TagsRepository]),
    forwardRef(() => OrdersModuleDb),
    AccountsStatsModuleGraph,
  ],
  providers: [
    AuctionsServiceDb,
    AuctionsForAssetRedisHandler,
    AssetAuctionsCountRedisHandler,
    AssetsRedisHandler,
    LowestAuctionRedisHandler,
    OnSaleAssetsCountForCollectionRedisHandler,
    AssetAvailableTokensCountRedisHandler,
  ],
  exports: [
    AuctionsServiceDb,
    TypeOrmModule.forFeature([TagsRepository]),
    TypeOrmModule.forFeature([AuctionEntity]),
  ],
})
export class AuctionsModuleDb {}
