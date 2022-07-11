import { Module } from '@nestjs/common';
import { AdminOperationsResolver } from './admin-operations.resolver';
import { ElrondCommunicationModule } from 'src/common';
import { FlagNftService } from './flag-nft.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftsFlagsRepository } from 'src/db/nftFlags';
import { VerifyContentService } from '../assets/verify-content.service';
import { CommonModule } from 'src/common.module';
import { NftRarityModuleGraph } from '../nft-rarity/nft-rarity.module';
import { AssetsRedisHandler } from '../assets';
import { ElasticRarityUpdaterService } from 'src/crons/elastic.updater/elastic-rarity.updater.service';

@Module({
  providers: [
    AdminOperationsResolver,
    FlagNftService,
    VerifyContentService,
    NftRarityModuleGraph,
    AssetsRedisHandler,
    ElasticRarityUpdaterService,
  ],
  imports: [
    CommonModule,
    ElrondCommunicationModule,
    TypeOrmModule.forFeature([NftsFlagsRepository]),
    CommonModule,
    NftRarityModuleGraph,
  ],
  exports: [FlagNftService, AssetsRedisHandler],
})
export class AdminOperationsModuleGraph {}
