import {
  Query,
  Resolver,
  Args,
  ResolveField,
  Int,
  Parent,
} from '@nestjs/graphql';
import { AccountStats } from './models/Account-Stats.dto';
import { AccountsStatsService } from './accounts-stats.service';
import { AccountStatsFilter } from './models/Account-Stats.Filter';

@Resolver(() => AccountStats)
export class AccountsStatsResolver {
  constructor(private accountsStatsService: AccountsStatsService) {}

  @Query(() => AccountStats)
  async accountStats(
    @Args({ name: 'filters', type: () => AccountStatsFilter })
    filters: AccountStatsFilter,
  ): Promise<AccountStats> {
    const account = await this.accountsStatsService.getStats(
      filters?.address,
      filters?.isOwner,
    );
    return AccountStats.fromEntity(account, filters?.address);
  }

  @ResolveField(() => Int)
  async claimable(@Parent() stats: AccountStats) {
    const { address } = stats;
    const claimableCount = await this.accountsStatsService.getClaimableCount(
      address,
    );
    return claimableCount || 0;
  }

  @ResolveField(() => Int)
  async collected(@Parent() stats: AccountStats) {
    const { address } = stats;
    const collectedCount = await this.accountsStatsService.getCollectedCount(
      address,
    );
    return collectedCount || 0;
  }

  @ResolveField(() => Int)
  async collections(@Parent() stats: AccountStats) {
    const { address } = stats;
    const collectionsCount =
      await this.accountsStatsService.getCollectionsCount(address);
    return collectionsCount || 0;
  }

  @ResolveField(() => Int)
  async creations(@Parent() stats: AccountStats) {
    const { address } = stats;
    const creationsCount = await this.accountsStatsService.getCreationsCount(
      address,
    );
    return creationsCount || 0;
  }
}