import { Inject, Injectable } from '@nestjs/common';
import '../../utils/extentions';
import { OrdersServiceDb } from 'src/db/orders/orders.service';
import { CreateOrderArgs, Order } from './models';
import { Price } from '../assets/models';
import { QueryRequest } from '../QueryRequest';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { RedisCacheService } from 'src/common/services/redis-cache.service';
import { Logger } from 'winston';
const hash = require('object-hash');

@Injectable()
export class OrdersService {
  constructor(
    private orderServiceDb: OrdersServiceDb,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private redisCacheService: RedisCacheService,
  ) {}

  async createOrder(createOrderArgs: CreateOrderArgs): Promise<Order> {
    const activeOrder = await this.orderServiceDb.getActiveOrdersForAuction(
      createOrderArgs.auctionId,
    );

    await this.invalidateCache();
    const orderEntity = await this.orderServiceDb.saveOrder(
      CreateOrderArgs.toEntity(createOrderArgs),
    );
    if (orderEntity && activeOrder) {
      await this.orderServiceDb.updateOrder(activeOrder);
    }
    return Order.fromEntity(orderEntity);
  }

  async getOrders(queryRequest: QueryRequest): Promise<[Order[], number]> {
    const cacheKey = this.getAuctionsCacheKey(queryRequest);
    const getOrders = () => this.getMappedOrders(queryRequest);
    return this.redisCacheService.getOrSet(cacheKey, getOrders, 300);
  }

  async getTopBid(auctionId: number): Promise<Price> {
    const cacheKey = this.getAuctionCacheKey(auctionId);
    const getTopBid = () => this.getPrice(auctionId);
    return this.redisCacheService.getOrSet(cacheKey, getTopBid, 300);
  }

  async getActiveOrderForAuction(auctionId: number): Promise<Order> {
    const cacheKey = this.getAuctionCacheKey(auctionId);
    const getActiveOrder = () => this.getActiveOrder(auctionId);
    return this.redisCacheService.getOrSet(cacheKey, getActiveOrder, 300);
  }

  private async getMappedOrders(queryRequest: QueryRequest) {
    const [ordersEntities, count] = await this.orderServiceDb.getOrders(
      queryRequest,
    );

    return [ordersEntities.map((order) => Order.fromEntity(order)), count];
  }

  private async getPrice(auctionId: number) {
    const lastOrder = await this.orderServiceDb.getActiveOrdersForAuction(
      auctionId,
    );
    return Price.fromEntity(lastOrder);
  }

  private async getActiveOrder(auctionId: number) {
    const orderEntity = await this.orderServiceDb.getActiveOrdersForAuction(
      auctionId,
    );
    return Order.fromEntity(orderEntity);
  }

  private getAuctionsCacheKey(request: QueryRequest) {
    return generateCacheKeyFromParams('auctions', hash(request));
  }

  private getAuctionCacheKey(auctionId: number) {
    return generateCacheKeyFromParams('auctions' + auctionId);
  }

  private async invalidateCache(): Promise<void> {
    return this.redisCacheService.delKeysContaining('auctions');
  }
}
