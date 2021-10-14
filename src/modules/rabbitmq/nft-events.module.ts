import { forwardRef, Module } from '@nestjs/common';
import { NftEventsService } from './nft-events.service';
import { NftTransactionsConsumer as NftEventsConsumer } from './nft-events.consumer';
import { AuctionsModuleGraph } from '../auctions/auctions.module';
import { OrdersModuleGraph } from '../orders/orders.module';
import { RevertEventsConsumer } from './revert-events.consumer';
import { RevertEventsService } from './revert.events.service';

@Module({
  imports: [
    forwardRef(() => AuctionsModuleGraph),
    forwardRef(() => OrdersModuleGraph),
  ],
  providers: [
    NftEventsConsumer,
    NftEventsService,
    RevertEventsConsumer,
    RevertEventsService,
  ],
  exports: [NftEventsService],
})
export class NftTransactionsModule {}