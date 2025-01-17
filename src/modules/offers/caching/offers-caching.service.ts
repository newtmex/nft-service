import { Injectable } from '@nestjs/common';
import '../../../utils/extensions';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import * as Redis from 'ioredis';
import { cacheConfig } from 'src/config';
import { TimeConstants } from 'src/utils/time-utils';
import * as hash from 'object-hash';
import { Offer } from '../models';
import { CachingService } from 'src/common/services/caching/caching.service';
import { OfferEntity } from 'src/db/offers';
import { OffersFilters } from '../models/Offers-Filters';
import { RedisCacheService } from 'src/common/services/caching/redis-cache.service';

@Injectable()
export class OffersCachingService {
  private redisClient: Redis.Redis;
  constructor(
    private cacheService: CachingService,
    private redisCacheService: RedisCacheService,
  ) {
    this.redisClient = this.cacheService.getClient(
      cacheConfig.persistentRedisClientName,
    );
  }

  public async getOrSetOffers(
    filters: OffersFilters,
    offset: number = 0,
    limit: number = 10,
    getOffers: () => any,
  ): Promise<[OfferEntity[], number]> {
    return this.redisCacheService.getOrSet(
      this.redisClient,
      this.getOffersCacheKey(filters, offset, limit),
      () => getOffers(),
      30 * TimeConstants.oneSecond,
    );
  }

  public async getOrSetOffersForAddress(
    address: string,
    getOrSetOffersForAddress: () => any,
  ): Promise<[OfferEntity[], number]> {
    return this.redisCacheService.getOrSet(
      this.redisClient,
      this.getOffersForOwnerCacheKey(address),
      () => getOrSetOffersForAddress(),
      30 * TimeConstants.oneMinute,
    );
  }

  public async getOrSetOffersForCollection(
    address: string,
    getOrSetOffersForCollection: () => any,
  ): Promise<[OfferEntity[], number]> {
    return this.redisCacheService.getOrSet(
      this.redisClient,
      this.getOffersForCollectionCacheKey(address),
      () => getOrSetOffersForCollection(),
      30 * TimeConstants.oneSecond,
    );
  }

  public async invalidateCache(
    collectionIdentifier?: string,
    ownerAddress?: string,
  ): Promise<void> {
    await this.redisCacheService.del(
      this.redisClient,
      this.getOffersForOwnerCacheKey(ownerAddress),
    );
    await this.redisCacheService.del(
      this.redisClient,
      this.getOffersForCollectionCacheKey(collectionIdentifier),
    );
    await this.redisCacheService.delByPattern(
      this.redisClient,
      this.getOffersCacheKey(),
    );
  }

  private getOffersCacheKey(
    request?: OffersFilters,
    offset: number = 0,
    limit: number = 10,
  ) {
    return generateCacheKeyFromParams(
      'offersHash',
      request ? hash(request) : '',
      offset,
      limit,
    );
  }

  private getOffersForOwnerCacheKey(address: string): string {
    return generateCacheKeyFromParams('offers_owner', address);
  }

  private getOffersForCollectionCacheKey(collection: string): string {
    return generateCacheKeyFromParams('offers_collection', collection);
  }
}
