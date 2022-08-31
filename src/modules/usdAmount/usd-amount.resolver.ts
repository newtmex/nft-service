import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { BaseResolver } from '../common/base.resolver';
import { Price } from '../assets/models';
import { UsdPriceLoader } from './loaders/usd-price.loader';
import { Token } from 'src/common/services/elrond-communication/models/Token.model';

@Resolver(() => Price)
export class UsdAmountResolver extends BaseResolver(Price) {
  constructor(private readonly usdPriceLoader: UsdPriceLoader) {
    super();
  }

  @ResolveField(() => String)
  async usdAmount(@Parent() price: Price) {
    return this.usdPriceLoader.getUsdAmountDenom(price.token, price.amount);
  }

  @ResolveField(() => Token)
  async tokenData(@Parent() price: Price) {
    return this.usdPriceLoader.getToken(price.token);
  }
}
