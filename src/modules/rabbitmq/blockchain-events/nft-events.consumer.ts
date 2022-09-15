import { Injectable } from '@nestjs/common';
import { NftEventEnum } from 'src/modules/assets/models';
import { MarketplacesService } from 'src/modules/marketplaces/marketplaces.service';
import { ELRONDNFTSWAP_KEY } from 'src/utils/constants';
import { CompetingRabbitConsumer } from '../rabbitmq.consumers';
import { ElrondSwapMarketplaceEventsService } from './elrondswap-marketplaces-events.service';
import { ExternalMarketplaceEventsService } from './external-marketplaces-events.service';
import { MinterEventsService } from './minter-events.service';
import { NftEventsService } from './nft-events.service';

@Injectable()
export class NftEventsConsumer {
  constructor(
    private readonly nftTransactionsService: NftEventsService,
    private readonly externalMarketplacesEventsService: ExternalMarketplaceEventsService,
    private readonly elrondSwapMarketplacesEventsService: ElrondSwapMarketplaceEventsService,
    private readonly minterEventsService: MinterEventsService,
    private readonly marketplaceService: MarketplacesService,
  ) {}

  @CompetingRabbitConsumer({
    connection: 'default',
    queueName: process.env.RABBITMQ_QUEUE,
    exchange: process.env.RABBITMQ_EXCHANGE,
    dlqExchange: process.env.RABBITMQ_DLQ_EXCHANGE,
  })
  async consumeAuctionEvents(nftAuctionEvents: any) {
    if (nftAuctionEvents?.events) {
      const internalMarketplaces =
        await this.marketplaceService.getInternalMarketplacesAddreses();

      const externalMarketplaces =
        await this.marketplaceService.getExternalMarketplacesAddreses();

      const nftSwapMarketplace =
        await this.marketplaceService.getMarketplaceByKey(ELRONDNFTSWAP_KEY);

      const minters = process.env.MINTERS_ADDRESSES.split(',').map((entry) => {
        return entry.toLowerCase().trim();
      });
      await this.nftTransactionsService.handleNftMintEvents(
        nftAuctionEvents?.events?.filter(
          (e: { identifier: NftEventEnum }) =>
            e.identifier === NftEventEnum.ESDTNFTCreate ||
            e.identifier === NftEventEnum.ESDTNFTTransfer ||
            e.identifier === NftEventEnum.MultiESDTNFTTransfer,
        ),
        nftAuctionEvents.hash,
      );
      await this.nftTransactionsService.handleNftAuctionEvents(
        nftAuctionEvents?.events?.filter(
          (e: { address: any }) =>
            internalMarketplaces.includes(e.address) === true,
        ),
        nftAuctionEvents.hash,
      );

      await this.externalMarketplacesEventsService.handleExternalAuctionEvents(
        nftAuctionEvents?.events?.filter(
          (e: { address: any }) =>
            externalMarketplaces.includes(e.address) === true,
        ),
        nftAuctionEvents.hash,
      );

      await this.elrondSwapMarketplacesEventsService.handleElrondNftSwapsAuctionEvents(
        nftAuctionEvents?.events?.filter(
          (e: { address: any }) =>
            nftSwapMarketplace.includes(e.address) === true,
        ),
        nftAuctionEvents.hash,
      );

      await this.minterEventsService.handleNftMinterEvents(
        nftAuctionEvents?.events?.filter(
          (e: { address: any }) => minters.includes(e.address) === true,
        ),
        nftAuctionEvents.hash,
      );
    }
  }
}
