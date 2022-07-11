import DataLoader = require('dataloader');
import { getRepository } from 'typeorm';
import { Injectable, Scope } from '@nestjs/common';
import { BaseProvider } from 'src/modules/common/base.loader';
import { FeaturedMarketplaceRedisHandler } from './featured-marketplace.redis-handler';
import { FeaturedMarketplaceEntity } from 'src/db/featuredMarketplaces';

@Injectable({
  scope: Scope.REQUEST,
})
export class FeaturedMarketplaceProvider extends BaseProvider<string> {
  constructor(
    featuredMarketplaceRedisHandler: FeaturedMarketplaceRedisHandler,
  ) {
    super(
      featuredMarketplaceRedisHandler,
      new DataLoader(async (keys: string[]) => await this.batchLoad(keys)),
    );
  }

  async getData(addresses: string[]) {
    const featuredMarketplace = await getRepository(FeaturedMarketplaceEntity)
      .createQueryBuilder('fm')
      .select('fm.address as address')
      .addSelect('fm.url as url')
      .addSelect('fm.name as name')
      .where(`fm.address IN(${addresses.map((value) => `'${value}'`)})`)
      .execute();
    return featuredMarketplace?.groupBy((asset) => asset.address);
  }
}