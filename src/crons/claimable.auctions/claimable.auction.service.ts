import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  AuctionsGetterService,
  AuctionsSetterService,
} from 'src/modules/auctions';
import { AuctionStatusEnum } from 'src/modules/auctions/models';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { Locker } from 'src/utils/locker';

@Injectable()
export class ClaimableAuctionsService {
  constructor(
    private auctionSetterService: AuctionsSetterService,
    private auctionGetterService: AuctionsGetterService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron('*/6 * * * * *')
  async updateClaimableAuctions() {
    await Locker.lock(
      'Update expired auctions to claimable',
      async () => {
        const endedAuctions =
          await this.auctionGetterService.getAuctionsThatReachedDeadline();
        await this.notificationsService.generateNotifications(endedAuctions);
        await this.auctionSetterService.updateAuctions(
          endedAuctions?.map((a) => {
            return {
              ...a,
              status: AuctionStatusEnum.Claimable,
              modifiedDate: new Date(new Date().toUTCString()),
            };
          }),
        );
      },
      true,
    );
  }
}
