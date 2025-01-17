import { Injectable } from '@nestjs/common';
import { RedisCacheService } from 'src/common';
import { CacheInfo } from 'src/common/services/caching/entities/cache.info';
import { cacheConfig } from 'src/config';
import { NftTypeEnum } from 'src/modules/assets/models';
import { RedisKeyValueDataloaderHandler } from 'src/modules/common/redis-key-value-dataloader.handler';
import { RedisValue } from 'src/modules/common/redis-value.dto';
import { TimeConstants } from 'src/utils/time-utils';
import { CollectionAssetModel } from '../models';

@Injectable()
export class CollectionAssetsRedisHandler extends RedisKeyValueDataloaderHandler<string> {
  constructor(redisCacheService: RedisCacheService) {
    super(
      redisCacheService,
      CacheInfo.CollectionAssets.key,
      cacheConfig.collectionsRedisClientName,
    );
  }

  mapValues(
    returnValues: { key: string; value: any }[],
    assetsIdentifiers: { [key: string]: any[] },
  ) {
    let response: RedisValue[] = [];
    const defaultNfts = [];
    const finalNfts = [];
    for (const item of returnValues) {
      if (item.value === null) {
        item.value = assetsIdentifiers[item.key]
          ? assetsIdentifiers[item.key].map((a) =>
              CollectionAssetModel.fromNft(a),
            )
          : [];
        if (this.hasDefaultThumbnailOrNoOwner(item)) {
          defaultNfts.push(item);
        } else {
          finalNfts.push(item);
        }
      }
    }

    response = [
      ...response,
      new RedisValue({
        values: finalNfts,
        ttl: CacheInfo.CollectionAssets.ttl,
      }),
      new RedisValue({ values: defaultNfts, ttl: TimeConstants.oneMinute }),
    ];
    return response;
  }

  private hasDefaultThumbnailOrNoOwner(item: { key: string; value: any }) {
    return (
      (item.value &&
        item.value.filter((i) => i.thumbnailUrl.includes('default')).length >
          0) ||
      (item.value &&
        item.value.type === NftTypeEnum.NonFungibleESDT &&
        !item.value.owner)
    );
  }
}
