import { Injectable, Logger } from '@nestjs/common';
import '../../utils/extensions';
import { PersistenceService } from 'src/common/persistence/persistence.service';
import { MarketplacesService } from './marketplaces.service';
import { MxElasticService } from 'src/common';
import { MarketplaceEventsEntity } from 'src/db/marketplaces/marketplace-events.entity';
import { MarketplacesCachingService } from './marketplaces-caching.service';
import { Locker } from 'src/utils/locker';
import { MarketplaceEventsIndexingRequest } from './models/MarketplaceEventsIndexingRequest';
import { BinaryUtils, ElasticQuery } from '@elrondnetwork/erdnest';
import {
  getMarketplaceEventsElasticQuery,
  getMarketplaceTransactionsElasticQuery,
} from './marketplaces.elastic.queries';

@Injectable()
export class MarketplaceEventsIndexingService {
  constructor(
    private readonly logger: Logger,
    private readonly persistenceService: PersistenceService,
    private readonly marketplaceService: MarketplacesService,
    private readonly marketplacesCachingService: MarketplacesCachingService,
    private readonly mxElasticService: MxElasticService,
  ) {}

  async reindexAllMarketplaceEvents(
    stopIfDuplicates: boolean = true,
    beforeTimestamp?: number,
    afterTimestamp?: number,
  ): Promise<void> {
    await Locker.lock(
      'reindexAllMarketplaceEvents',
      async () => {
        let [marketplaces] = await this.persistenceService.getMarketplaces();
        let marketplaceAddresses = [
          ...new Set(marketplaces.map((marketplace) => marketplace.address)),
        ];
        for (let i = 0; i < marketplaceAddresses.length; i++) {
          await this.reindexMarketplaceEvents(
            new MarketplaceEventsIndexingRequest({
              marketplaceAddress: marketplaceAddresses[i],
              beforeTimestamp,
              afterTimestamp,
              stopIfDuplicates,
            }),
          );
        }
      },
      true,
    );
  }

  async reindexLatestMarketplacesEvents(events: any[]): Promise<void> {
    const marketplaces: string[] = [
      ...new Set(events.map((event) => event.address)),
    ];
    marketplaces.map(async (marketplace) => {
      await Locker.lock(
        `${this.reindexLatestMarketplacesEvents.name} for ${marketplace}`,
        async () => {
          const marketplaceLastIndexTimestamp =
            await this.getMarketplaceLastIndexTimestamp(marketplace);
          await this.reindexMarketplaceEvents(
            new MarketplaceEventsIndexingRequest({
              marketplaceAddress: marketplace,
              afterTimestamp: marketplaceLastIndexTimestamp,
              stopIfDuplicates: true,
            }),
          );
        },
        true,
      );
    });
  }

  async reindexMarketplaceEvents(
    input: MarketplaceEventsIndexingRequest,
  ): Promise<void> {
    try {
      if (input.beforeTimestamp < input.afterTimestamp) {
        throw new Error(`beforeTimestamp can't be less than afterTimestamp`);
      }

      const newestTxTimestamp =
        await this.addElasticTxToDbAndReturnNewestTimestamp(input);
      const newestEventTimestamp =
        await this.addElasticEventsToDbAndReturnNewestTimestamp(input);

      const newestTimestamp = Math.max(newestTxTimestamp, newestEventTimestamp);

      if (
        newestTimestamp &&
        (!input.marketplaceLastIndexTimestamp ||
          newestTimestamp > input.marketplaceLastIndexTimestamp)
      ) {
        await this.marketplaceService.updateMarketplaceLastIndexTimestampByAddress(
          input.marketplaceAddress,
          newestTimestamp,
        );
        await this.marketplacesCachingService.invalidateMarketplacesCache();
      }
    } catch (error) {
      this.logger.error('Error when reindexing marketplace events', {
        path: `${MarketplaceEventsIndexingService.name}.${this.reindexMarketplaceEvents.name}`,
        error: error.message,
        marketplaceAddress: input.marketplaceAddress,
      });
    }
  }

  private async addElasticTxToDbAndReturnNewestTimestamp(
    input: MarketplaceEventsIndexingRequest,
  ): Promise<number> {
    return await this.addGenericElasticDataToDbAndReturnNewestTimestamp(
      getMarketplaceTransactionsElasticQuery(input),
      'transactions',
      input.marketplaceAddress,
      this.saveTxToDb.bind(this),
      input.stopIfDuplicates,
    );
  }

  private async addElasticEventsToDbAndReturnNewestTimestamp(
    input: MarketplaceEventsIndexingRequest,
  ): Promise<number> {
    return await this.addGenericElasticDataToDbAndReturnNewestTimestamp(
      getMarketplaceEventsElasticQuery(input),
      'logs',
      input.marketplaceAddress,
      this.saveEventsToDb.bind(this),
      input.stopIfDuplicates,
    );
  }

  private async addGenericElasticDataToDbAndReturnNewestTimestamp(
    elasticQuery: ElasticQuery,
    elasticCollection: string,
    marketplaceAddress: string,
    saveToDbFunction: (
      items: any[],
      marketplaceAddress: string,
    ) => Promise<[number, number]>,
    stopIfDuplicates?: boolean,
  ): Promise<number> {
    let newestTimestamp: number;

    await this.mxElasticService.getScrollableList(
      elasticCollection,
      'identifier',
      elasticQuery,
      async (items) => {
        if (!items || items.length === 0) {
          return false;
        }

        if (!newestTimestamp) {
          newestTimestamp = items[0].timestamp;
        }

        const [savedItemsCount, totalEventsCount] = await saveToDbFunction(
          items,
          marketplaceAddress,
        );

        if (stopIfDuplicates && savedItemsCount !== totalEventsCount) {
          return false;
        }
      },
    );

    return newestTimestamp;
  }

  private async getMarketplaceLastIndexTimestamp(
    marketplaceAddress: string,
  ): Promise<number> {
    const marketplace = await this.marketplaceService.getMarketplaceByAddress(
      marketplaceAddress,
    );
    return marketplace.lastIndexTimestamp;
  }

  private async saveTxToDb(
    transactions: any,
    marketplaceAddress: string,
  ): Promise<[number, number]> {
    let marketplaceEvents: MarketplaceEventsEntity[] = [];

    for (let i = 0; i < transactions.length; i++) {
      const marketplaceEvent = new MarketplaceEventsEntity({
        txHash: transactions[i].identifier,
        isTx: true,
        marketplaceAddress: marketplaceAddress,
        timestamp: transactions[i].timestamp,
        data: {
          txData: {
            sender: transactions[i].sender,
            receiver: transactions[i].receiver,
            data: BinaryUtils.base64Decode(transactions[i].data ?? ''),
            value: transactions[i].value,
            blockHash: transactions[i].miniBlockHash ?? '',
          },
        },
      });
      marketplaceEvents.push(marketplaceEvent);
    }

    const savedRecordsCount =
      await this.persistenceService.saveOrIgnoreMarketplacesBulk(
        marketplaceEvents,
      );
    return [savedRecordsCount, marketplaceEvents.length];
  }

  private async saveEventsToDb(
    batch: any,
    marketplaceAddress: string,
  ): Promise<[number, number]> {
    let marketplaceEvents: MarketplaceEventsEntity[] = [];

    for (let i = 0; i < batch.length; i++) {
      for (let j = 0; j < batch[i].events.length; j++) {
        const event = batch[i].events[j];

        const marketplaceEvent = new MarketplaceEventsEntity({
          txHash: batch[i].identifier,
          originalTxHash: batch[i].originalTxHash,
          eventOrder: event.order,
          marketplaceAddress: marketplaceAddress,
          timestamp: batch[i].timestamp,
          data: {
            eventData: event,
          },
        });
        marketplaceEvents.push(marketplaceEvent);
      }
    }

    const savedRecordsCount =
      await this.persistenceService.saveOrIgnoreMarketplacesBulk(
        marketplaceEvents,
      );
    return [savedRecordsCount, marketplaceEvents.length];
  }
}
