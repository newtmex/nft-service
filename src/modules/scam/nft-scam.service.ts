import { Injectable, Logger } from '@nestjs/common';
import { MxApiService, MxElasticService, Nft } from 'src/common';

import { Locker } from 'src/utils/locker';
import { ScamInfo } from '../assets/models/ScamInfo.dto';
import { ScamInfoTypeEnum } from '../assets/models';
import { NftScamElasticService } from './nft-scam.elastic.service';
import { NftScamRelatedData } from './models/nft-scam-data.model';
import { elasticDictionary } from 'src/config';
import { NftScamInfoModel } from './models/nft-scam-info.model';
import { DocumentDbService } from 'src/document-db/document-db.service';
import { MxApiAbout } from 'src/common/services/mx-communication/models/mx-api-about.model';
import { CacheEventsPublisherService } from '../rabbitmq/cache-invalidation/cache-invalidation-publisher/change-events-publisher.service';
import {
  CacheEventTypeEnum,
  ChangedEvent,
} from '../rabbitmq/cache-invalidation/events/changed.event';
import { getAllCollectionNftsFromElasticQuery } from './nft-scam.queries';

@Injectable()
export class NftScamService {
  constructor(
    private documentDbService: DocumentDbService,
    private nftScamElasticService: NftScamElasticService,
    private mxElasticService: MxElasticService,
    private mxApiService: MxApiService,
    private readonly cacheEventsPublisher: CacheEventsPublisherService,
    private readonly logger: Logger,
  ) {}

  async validateOrUpdateNftScamInfo(
    identifier: string,
    nftScamRelatedData?: NftScamRelatedData,
    clearManualScamInfo: boolean = false,
  ): Promise<boolean> {
    const [nftFromApi, nftFromElastic, nftFromDb, mxApiAbout]: [
      Nft,
      any,
      NftScamInfoModel,
      MxApiAbout,
    ] = await this.getNftsAndMxAbout(identifier, nftScamRelatedData);
    const scamEngineVersion = mxApiAbout.scamEngineVersion;

    if (
      nftFromDb?.version === elasticDictionary.scamInfo.manualVersionValue &&
      !clearManualScamInfo
    ) {
      return true;
    }

    if (!nftFromApi.scamInfo) {
      await this.validateOrUpdateScamInfoDataForNoScamNft(
        scamEngineVersion,
        nftFromApi,
        nftFromElastic,
        nftFromDb,
      );
    } else if (nftFromApi.scamInfo) {
      await this.validateOrUpdateScamInfoDataForScamNft(
        scamEngineVersion,
        nftFromApi,
        nftFromElastic,
        nftFromDb,
      );
    }

    return true;
  }

  async getNftsAndMxAbout(
    identifier: string,
    nftScamRelatedData?: NftScamRelatedData,
  ): Promise<[Nft, any, NftScamInfoModel, MxApiAbout]> {
    return await Promise.all([
      nftScamRelatedData?.nftFromApi ??
        this.mxApiService.getNftScamInfo(identifier, true),
      nftScamRelatedData?.nftFromElastic ??
        this.nftScamElasticService.getNftWithScamInfoFromElastic(identifier),
      nftScamRelatedData?.nftFromDb ??
        this.documentDbService.getNftScamInfo(identifier),
      nftScamRelatedData?.mxApiAbout ?? this.mxApiService.getMxApiAbout(),
    ]);
  }

  async validateOrUpdateAllNftsScamInfo(): Promise<void> {
    await Locker.lock(
      'updateAllNftsScamInfos: Update scam info for all existing NFTs',
      async () => {
        try {
          const mxApiAbout = await this.mxApiService.getMxApiAbout();
          const scamEngineVersion = mxApiAbout.scamEngineVersion;

          const collections =
            await this.nftScamElasticService.getAllCollectionsFromElastic();

          for (let i = 0; i < collections.length; i++) {
            await this.validateOrUpdateAllNftsScamInfoForCollection(
              collections[i],
              scamEngineVersion,
            );
          }

          this.logger.log(
            `Processed NFT Scam Info for ${collections.length} collections`,
            {
              path: `${NftScamService.name}.${this.validateOrUpdateAllNftsScamInfo.name}`,
            },
          );
        } catch (error) {
          this.logger.error(
            `Error when updating/validating scam info for all collections`,
            {
              path: `${NftScamService.name}.${this.validateOrUpdateAllNftsScamInfo.name}`,
              exception: error?.message,
            },
          );
        }
      },
      true,
    );
  }

  async validateOrUpdateAllNftsScamInfoForCollection(
    collection: string,
    scamEngineVersion: string,
  ): Promise<void> {
    this.logger.log(`Processing scamInfo for ${collection}...`);
    const nftsQuery = getAllCollectionNftsFromElasticQuery(collection);
    await this.mxElasticService.getScrollableList(
      'tokens',
      'identifier',
      nftsQuery,
      async (nftsBatch) => {
        await this.validateOrUpdateNftsScamInfoBatch(
          nftsBatch,
          scamEngineVersion,
        );
      },
    );
  }

  async manuallySetNftScamInfo(
    identifier: string,
    type: ScamInfoTypeEnum,
    info: string,
  ): Promise<boolean> {
    await Promise.all([
      this.documentDbService.saveOrUpdateNftScamInfo(
        identifier,
        'manual',
        new ScamInfo({
          type: ScamInfoTypeEnum[type],
          info: info,
        }),
      ),
      this.nftScamElasticService.setNftScamInfoManuallyInElastic(
        identifier,
        type,
        info,
      ),
    ]);
    this.triggerCacheInvalidation(identifier);
    return true;
  }

  async manuallyClearNftScamInfo(identifier: string): Promise<boolean> {
    const cleared = await this.validateOrUpdateNftScamInfo(
      identifier,
      {},
      true,
    );
    this.triggerCacheInvalidation(identifier);
    return cleared;
  }

  private async triggerCacheInvalidation(identifier: string): Promise<void> {
    await this.cacheEventsPublisher.publish(
      new ChangedEvent({
        id: identifier,
        type: CacheEventTypeEnum.AssetRefresh,
      }),
    );
  }

  private async validateOrUpdateScamInfoDataForNoScamNft(
    scamEngineVersion: string,
    nftFromApi: Nft,
    nftFromElastic: any,
    nftFromDb: NftScamInfoModel,
  ): Promise<void> {
    const clearScamInfoInElastic =
      nftFromElastic?.[elasticDictionary.scamInfo.typeKey];

    const updateScamInfoInDb =
      !nftFromDb || nftFromDb.type || nftFromDb.version !== scamEngineVersion;

    let updatePromises = [];

    if (updateScamInfoInDb) {
      updatePromises.push(
        this.documentDbService.saveOrUpdateNftScamInfo(
          nftFromApi.identifier,
          scamEngineVersion,
        ),
      );
    }
    if (clearScamInfoInElastic) {
      updatePromises.push(
        this.nftScamElasticService.setBulkNftScamInfoInElastic(
          [nftFromApi],
          true,
        ),
      );
    }

    await Promise.all(updatePromises);
  }

  private async validateOrUpdateScamInfoDataForScamNft(
    scamEngineVersion: string,
    nftFromApi: Nft,
    nftFromElastic: any,
    nftFromDb: NftScamInfoModel,
  ): Promise<void> {
    const isElasticScamInfoDifferent =
      ScamInfo.areApiAndElasticScamInfoDifferent(nftFromApi, nftFromElastic);
    const isDbScamInfoDifferent = ScamInfo.areApiAndDbScamInfoDifferent(
      nftFromApi,
      nftFromDb,
      scamEngineVersion,
    );

    let updatePromises = [];

    if (isDbScamInfoDifferent) {
      updatePromises.push(
        this.documentDbService.saveOrUpdateNftScamInfo(
          nftFromApi.identifier,
          scamEngineVersion,
          new ScamInfo({
            type: ScamInfoTypeEnum[nftFromApi.scamInfo.type],
            info: nftFromApi.scamInfo.info,
          }),
        ),
      );
    }
    if (isElasticScamInfoDifferent) {
      updatePromises.push(
        this.nftScamElasticService.setBulkNftScamInfoInElastic([nftFromApi]),
      );
    }

    await Promise.all(updatePromises);
  }

  private async validateOrUpdateNftsScamInfoBatch(
    nftsFromElastic: any,
    scamEngineVersion: string,
  ): Promise<void> {
    if (!nftsFromElastic || nftsFromElastic.length === 0) {
      return;
    }

    const [
      nftsNoScamOutdatedInElastic,
      nftsScamOutdatedInElastic,
      nftsOutdatedOrMissingFromDb,
      nftsToMigrateFromDbToElastic,
    ] = await this.filterOutdatedNfts(nftsFromElastic, scamEngineVersion);

    const elasticUpdates = this.nftScamElasticService
      .buildNftScamInfoBulkUpdate(nftsScamOutdatedInElastic)
      .concat(
        this.nftScamElasticService.buildNftScamInfoBulkUpdate(
          nftsNoScamOutdatedInElastic,
          true,
        ),
      )
      .concat(
        this.nftScamElasticService.buildNftScamInfoDbToElasticMigrationBulkUpdate(
          nftsToMigrateFromDbToElastic,
          nftsFromElastic,
        ),
      );

    await Promise.all([
      this.nftScamElasticService.updateBulkNftScamInfoInElastic(elasticUpdates),
      this.documentDbService.saveOrUpdateBulkNftScamInfo(
        nftsOutdatedOrMissingFromDb,
        scamEngineVersion,
      ),
    ]);
  }

  private async filterOutdatedNfts(
    nftsFromElastic: any,
    scamEngineVersion: string,
  ): Promise<[Nft[], Nft[], Nft[], NftScamInfoModel[]]> {
    const [nftsOutdatedOrMissingFromDb, nftsToMigrateFromDbToElastic]: [
      Nft[],
      NftScamInfoModel[],
    ] = await this.getMissingNftsFromDbOrOutdatedInElastic(
      nftsFromElastic,
      scamEngineVersion,
    );

    if (
      !nftsOutdatedOrMissingFromDb ||
      nftsOutdatedOrMissingFromDb.length === 0
    ) {
      return [[], [], [], nftsToMigrateFromDbToElastic];
    }

    const [nftsNoScamOutdatedInElastic, nftsScamOutdatedInElastic]: [
      Nft[],
      Nft[],
    ] = await this.filterOutdatedNftsInElastic(
      nftsOutdatedOrMissingFromDb,
      nftsFromElastic,
    );

    return [
      nftsNoScamOutdatedInElastic,
      nftsScamOutdatedInElastic,
      nftsOutdatedOrMissingFromDb,
      nftsToMigrateFromDbToElastic,
    ];
  }

  private async getMissingNftsFromDbOrOutdatedInElastic(
    nftsFromElastic: any,
    scamEngineVersion: string,
  ): Promise<[Nft[], NftScamInfoModel[]]> {
    let nftsOutdatedOrMissingFromDb: Nft[] = [];
    let nftsToMigrateFromDbToElastic: NftScamInfoModel[] = [];

    const identifiers = nftsFromElastic.map((nft) => nft.identifier);

    const nftsFromDb: NftScamInfoModel[] =
      await this.documentDbService.getBulkNftScamInfo(identifiers);

    if (!nftsFromElastic || nftsFromElastic.length === 0) {
      return [[], []];
    }

    let missingOrOutdatedNftsInDb: string[] = [];

    for (let i = 0; i < nftsFromElastic?.length; i++) {
      const nftFromElastic = nftsFromElastic[i];
      const nftFromDb = nftsFromDb?.find(
        (nft) => nft.identifier === nftFromElastic.identifier,
      );

      const isNftMissingFromDb =
        !nftFromDb || nftFromDb.version !== scamEngineVersion;

      if (isNftMissingFromDb) {
        missingOrOutdatedNftsInDb.push(nftFromElastic.identifier);
        continue;
      }

      if (
        ScamInfo.areElasticAndDbScamInfoDifferent(nftFromElastic, nftFromDb)
      ) {
        nftsToMigrateFromDbToElastic.push(nftFromDb);
      }
    }

    if (missingOrOutdatedNftsInDb.length === 0) {
      return [[], nftsToMigrateFromDbToElastic];
    }

    nftsOutdatedOrMissingFromDb = await this.mxApiService.getBulkNftScamInfo(
      identifiers,
      true,
    );

    return [nftsOutdatedOrMissingFromDb, nftsToMigrateFromDbToElastic];
  }

  private async filterOutdatedNftsInElastic(
    nftsOutdatedOrMissingFromDb: Nft[],
    nftsFromElastic: any,
  ): Promise<[Nft[], Nft[]]> {
    let nftsNoScamOutdatedInElastic: Nft[] = [];
    let nftsScamOutdatedInElastic: Nft[] = [];
    for (let i = 0; i < nftsOutdatedOrMissingFromDb?.length; i++) {
      const nftFromApi = nftsOutdatedOrMissingFromDb[i];
      let nftFromElastic = nftsFromElastic.find(
        (nft) => nft.identifier === nftFromApi.identifier,
      );

      if (!nftFromApi.scamInfo) {
        const updateScamInfoInElastic =
          nftFromElastic?.[elasticDictionary.scamInfo.typeKey];

        if (updateScamInfoInElastic) {
          nftsNoScamOutdatedInElastic.push(nftFromApi);
        }
      } else if (nftFromApi.scamInfo) {
        const isElasticScamInfoDifferent =
          ScamInfo.areApiAndElasticScamInfoDifferent(
            nftFromApi,
            nftFromElastic,
          );

        if (isElasticScamInfoDifferent) {
          nftsScamOutdatedInElastic.push(nftFromApi);
        }
      }
    }
    return [nftsNoScamOutdatedInElastic, nftsScamOutdatedInElastic];
  }
}
