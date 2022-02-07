import { forwardRef, Module } from '@nestjs/common';
import { AccountsResolver } from './accounts.resolver';
import { AccountsService } from './accounts.service';
import { FollowersModuleDb } from 'src/db/followers/followers.module.db';
import { AssetsModuleGraph } from '../assets/assets.module';
import { AccountsProvider } from './accounts.loader';
import { ElrondCommunicationModule } from 'src/common';
import { AccountsRedisHandler } from './accounts.redis-handler';
import { AccountsStatsResolver } from './accounts-stats.resolver';
import { AccountsStatsService } from './accounts-stats.service';
import { AccountStatsRepository } from 'src/db/assets/account-stats.repository';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  providers: [
    AccountsService,
    AccountsStatsService,
    AccountsResolver,
    AccountsStatsResolver,
    AccountsRedisHandler,
    AccountsProvider,
  ],
  imports: [
    ElrondCommunicationModule,
    forwardRef(() => AssetsModuleGraph),
    FollowersModuleDb,
    TypeOrmModule.forFeature([AccountStatsRepository]),
  ],
  exports: [AccountsService, AccountsRedisHandler, AccountsProvider],
})
export class AccountsModuleGraph {}
