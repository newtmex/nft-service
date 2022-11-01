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
import { OrdersRepository } from 'src/db/orders';
import { ReportNftsRepository } from 'src/db/reportNft/report-nft.repository';
import { TraitRepositoryService } from 'src/document-db/repositories/traits.repository';
import {
  CollectionTraitSummary,
  CollectionTraitSummarySchema,
} from 'src/modules/nft-traits/models/collection-traits.model';
import { CacheEventsPublisherModule } from 'src/modules/rabbitmq/cache-invalidation/cache-invalidation-publisher/change-events-publisher.module';
import { PersistenceService } from './persistence.service';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from 'src/common.module';
import { ApiConfigService } from 'src/utils/api.config.service';
import { UsdPriceService } from 'src/modules/usdPrice/usd-price.service';
import { ElrondCommunicationModule } from '../services/elrond-communication';
import { NftScamsRepository } from 'src/db/reports-nft-scam';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AssetsLikesRepository]),
    TypeOrmModule.forFeature([FeaturedCollectionsRepository]),
    TypeOrmModule.forFeature([FeaturedNftsRepository]),
    TypeOrmModule.forFeature([TagsRepository]),
    TypeOrmModule.forFeature([CampaignsRepository]),
    TypeOrmModule.forFeature([TiersRepository]),
    TypeOrmModule.forFeature([MarketplaceRepository]),
    TypeOrmModule.forFeature([MarketplaceCollectionsRepository]),
    TypeOrmModule.forFeature([ReportNftsRepository]),
    TypeOrmModule.forFeature([NftScamsRepository]),
    TypeOrmModule.forFeature([NftsFlagsRepository]),
    TypeOrmModule.forFeature([NftRarityRepository]),
    TypeOrmModule.forFeature([NotificationsRepository]),
    TypeOrmModule.forFeature([OrdersRepository]),
    TypeOrmModule.forFeature([AuctionEntity]),
    CacheEventsPublisherModule,
    MongooseModule.forRootAsync({
      imports: [CommonModule],
      useFactory: async (configService: ApiConfigService) => ({
        uri: `${configService.getNftTraitSummariesDbUrl()}`,
        dbName: configService.getNftTraitSummariesDatabase(),
        user: configService.getNftTraitSummariesUsername(),
        pass: configService.getNftTraitSummariesPassword(),
        tlsAllowInvalidCertificates: true,
      }),
      inject: [ApiConfigService],
    }),
    MongooseModule.forFeature([
      {
        name: CollectionTraitSummary.name,
        schema: CollectionTraitSummarySchema,
      },
    ]),
    ElrondCommunicationModule,
  ],
  providers: [
    UsdPriceService,
    PersistenceService,
    AccountStatsRepository,
    CollectionStatsRepository,
    AuctionsRepository,
    TraitRepositoryService,
  ],
  exports: [PersistenceService, UsdPriceService],
})
export class PersistenceModule {}