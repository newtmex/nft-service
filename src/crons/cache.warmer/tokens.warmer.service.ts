import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as Redis from 'ioredis';
import { CacheInfo } from 'src/common/services/caching/entities/cache.info';
import { Locker } from 'src/utils/locker';
import { ClientProxy } from '@nestjs/microservices';
import { cacheConfig } from 'src/config';
import { CachingService } from 'src/common/services/caching/caching.service';
import { MxApiService } from 'src/common';

@Injectable()
export class TokensWarmerService {
  private redisClient: Redis.Redis;
  constructor(
    @Inject('PUBSUB_SERVICE') private clientProxy: ClientProxy,
    private cacheService: CachingService,
    private mxApiService: MxApiService,
  ) {
    this.redisClient = this.cacheService.getClient(
      cacheConfig.persistentRedisClientName,
    );
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async updateTokens() {
    await Locker.lock(
      'Tokens invalidations',
      async () => {
        const tokens = await this.mxApiService.getAllTokens();
        await this.invalidateKey(
          CacheInfo.AllTokens.key,
          tokens,
          CacheInfo.AllTokens.ttl,
        );
      },
      true,
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async updateDexTokens() {
    await Locker.lock(
      'DEX Tokens invalidations',
      async () => {
        const tokens = await this.mxApiService.getAllDexTokens();
        await this.invalidateKey(
          CacheInfo.AllDexTokens.key,
          tokens,
          CacheInfo.AllDexTokens.ttl,
        );
      },
      true,
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async updateEgldTokens() {
    await Locker.lock(
      'Egld Token invalidation',
      async () => {
        const tokens = await this.mxApiService.getEgldPriceFromEconomics();
        await this.invalidateKey(
          CacheInfo.EgldToken.key,
          tokens,
          CacheInfo.EgldToken.ttl,
        );
      },
      true,
    );
  }

  private async invalidateKey(key: string, data: any, ttl: number) {
    await this.cacheService.setCache(this.redisClient, key, data, ttl);
    await this.refreshCacheKey(key, ttl);
  }

  private async refreshCacheKey(key: string, ttl: number) {
    await this.clientProxy.emit<{
      redisClient: Redis.Redis;
      key: string;
      ttl: number;
    }>('refreshCacheKey', {
      redisClientName: cacheConfig.persistentRedisClientName,
      key,
      ttl,
    });
  }
}
