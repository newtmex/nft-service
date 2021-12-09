import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { AuctionsService } from 'src/modules/auctions';
import { AuctionStatusEnum } from 'src/modules/auctions/models';
import { Logger } from 'winston';

@Injectable()
export class ClaimableAuctionsService {
  constructor(
    private auctionService: AuctionsService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Cron('*/6 * * * * *')
  async updateClaimableAuctions() {
    try {
      const endedAuctions =
        await this.auctionService.getAuctionsThatReachedDeadline();

      await this.auctionService.updateAuctions(
        endedAuctions?.map((a) => {
          return {
            ...a,
            status: AuctionStatusEnum.Claimable,
            modifiedDate: new Date(new Date().toUTCString()),
          };
        }),
      );
    } catch (error) {
      this.logger.error(
        'An error occurred while trying to update auctions that reach the deadline.',
        {
          path: 'ClaimableAuctionsService',
          exception: error,
        },
      );
    }
  }
}