import { EntityRepository, Repository } from 'typeorm';
import { NotificationEntity } from '.';
import { NotificationStatusEnum } from 'src/modules/notifications/models';
import { getMarketplaceKeyFilter } from '../collection-stats/sqlUtils';

@EntityRepository(NotificationEntity)
export class NotificationsRepository extends Repository<NotificationEntity> {
  async getNotificationsForAddress(
    address: string,
    marketplaceKey: string,
  ): Promise<[NotificationEntity[], number]> {
    const defaultSize = 100;
    return await this.createQueryBuilder('not')
      .where(
        `not.ownerAddress = :address AND not.status='active' 
        ${getMarketplaceKeyFilter('not', marketplaceKey)}`,
        {
          address: address,
          marketplaceKey: marketplaceKey,
        },
      )
      .limit(defaultSize)
      .orderBy('id', 'DESC')
      .getManyAndCount();
  }

  async getNotificationsByAuctionIds(
    auctionIds: number[],
  ): Promise<NotificationEntity[]> {
    return await this.createQueryBuilder('n')
      .where(`n.auctionId in (:...ids) and n.status='active'`, {
        ids: auctionIds,
      })
      .getMany();
  }

  async getNotificationByIdAndOwner(
    auctionId: number,
    ownerAddress: string,
  ): Promise<NotificationEntity> {
    return await this.createQueryBuilder('n')
      .where(
        `n.auctionId =:id and n.status='active' and n.ownerAddress=:ownerAddress`,
        {
          id: auctionId,
          ownerAddress: ownerAddress,
        },
      )
      .getOne();
  }

  async saveNotification(notification: NotificationEntity) {
    return await this.save(notification);
  }

  async saveNotifications(notifications: NotificationEntity[]) {
    return await this.save(notifications);
  }

  async updateNotification(notification: NotificationEntity) {
    notification.status = NotificationStatusEnum.Inactive;
    notification.modifiedDate = new Date(new Date().toUTCString());
    return await this.save(notification);
  }
}
