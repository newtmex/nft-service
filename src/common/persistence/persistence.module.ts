import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountStatsRepository } from 'src/db/account-stats/account-stats.repository';
import { AssetsLikesRepository } from 'src/db/assets/assets-likes.repository';
import { AuctionEntity } from 'src/db/auctions/auction.entity';
import { AuctionsRepository } from 'src/db/auctions/auctions.repository';
import { TagsRepository } from 'src/db/auctions/tags.repository';
import { CampaignsRepository } from 'src/db/campaigns/campaigns.repository';
import { TiersRepository } from 'src/db/campaigns/tiers.repository';
import { CollectionStatsRepository } from 'src/db/collection-stats/collection-stats.repository';
import {
  FeaturedCollectionsRepository,
  FeaturedNftsRepository,
} from 'src/db/featuredNfts/featured.repository';
import { MarketplaceCollectionsRepository } from 'src/db/marketplaces/marketplace-collections.repository';
import { MarketplaceRepository } from 'src/db/marketplaces/marketplaces.repository';
import { NftRarityRepository } from 'src/db/nft-rarity/nft-rarity.repository';
import { NftsFlagsRepository } from 'src/db/nftFlags/nft-flags.repository';
import { NotificationsRepository } from 'src/db/notifications';
import { OfferEntity, OffersRepository } from 'src/db/offers';
import { OrdersRepository } from 'src/db/orders';
import { ReportNftsRepository } from 'src/db/reports/report-nft.repository';
import { CacheEventsPublisherModule } from 'src/modules/rabbitmq/cache-invalidation/cache-invalidation-publisher/change-events-publisher.module';
import { PersistenceService } from './persistence.service';
import { UsdPriceService } from 'src/modules/usdPrice/usd-price.service';
import { MxCommunicationModule } from '../services/mx-communication';
import { MarketplaceEventsRepository } from 'src/db/marketplaces/marketplace-events.repository';
import { BlacklistedCollectionsRepository } from 'src/db/blacklistedCollections/blacklisted.repository';
import { ReportCollectionsRepository } from 'src/db/reports';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AssetsLikesRepository]),
    TypeOrmModule.forFeature([FeaturedCollectionsRepository]),
    TypeOrmModule.forFeature([FeaturedNftsRepository]),
    TypeOrmModule.forFeature([BlacklistedCollectionsRepository]),
    TypeOrmModule.forFeature([TagsRepository]),
    TypeOrmModule.forFeature([CampaignsRepository]),
    TypeOrmModule.forFeature([TiersRepository]),
    TypeOrmModule.forFeature([MarketplaceRepository]),
    TypeOrmModule.forFeature([MarketplaceCollectionsRepository]),
    TypeOrmModule.forFeature([ReportNftsRepository]),
    TypeOrmModule.forFeature([ReportCollectionsRepository]),
    TypeOrmModule.forFeature([NftsFlagsRepository]),
    TypeOrmModule.forFeature([NftRarityRepository]),
    TypeOrmModule.forFeature([NotificationsRepository]),
    TypeOrmModule.forFeature([OrdersRepository]),
    TypeOrmModule.forFeature([AuctionEntity]),
    TypeOrmModule.forFeature([OfferEntity]),
    TypeOrmModule.forFeature([MarketplaceEventsRepository]),
    CacheEventsPublisherModule,
    MxCommunicationModule,
  ],
  providers: [
    UsdPriceService,
    PersistenceService,
    AccountStatsRepository,
    CollectionStatsRepository,
    AuctionsRepository,
    OffersRepository,
  ],
  exports: [PersistenceService, UsdPriceService],
})
export class PersistenceModule {}
