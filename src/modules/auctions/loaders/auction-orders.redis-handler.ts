import { Injectable } from '@nestjs/common';
import { RedisCacheService } from 'src/common';
import { OrderEntity } from 'src/db/orders';
import { RedisKeyValueDataloaderHandler } from 'src/modules/common/redis-key-value-dataloader.handler';
import { RedisValue } from 'src/modules/common/redis-value.dto';
import { TimeConstants } from 'src/utils/time-utils';

@Injectable()
export class AuctionsOrdersRedisHandler extends RedisKeyValueDataloaderHandler<string> {
  constructor(redisCacheService: RedisCacheService) {
    super(redisCacheService, 'auction_orders');
  }

  mapValues(
    returnValues: { key: string; value: any }[],
    ordersAuctionsIds: { [key: string]: OrderEntity[] },
  ) {
    const redisValues = [];
    for (const item of returnValues) {
      if (item.value === null) {
        item.value = ordersAuctionsIds[item.key]
          ? ordersAuctionsIds[item.key]
          : 0;
        redisValues.push(item);
      }
    }

    return [
      new RedisValue({ values: redisValues, ttl: TimeConstants.oneWeek }),
    ];
  }
}