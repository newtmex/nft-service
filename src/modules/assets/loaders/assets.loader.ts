import DataLoader = require('dataloader');
import { ElrondApiService } from 'src/common';
import { BaseProvider } from '../../common/base.loader';
import { AssetScamInfoProvider } from './assets-scam-info.loader';
import { AssetsRedisHandler } from './assets.redis-handler';
import { Injectable, Scope } from '@nestjs/common';

@Injectable({
  scope: Scope.REQUEST,
})
export class AssetsProvider extends BaseProvider<string> {
  constructor(
    assetstRedisHandler: AssetsRedisHandler,
    private assetScamLoader: AssetScamInfoProvider,
    private apiService: ElrondApiService,
  ) {
    super(
      assetstRedisHandler,
      new DataLoader(async (keys: string[]) => await this.batchLoad(keys)),
    );
  }

  async getData(identifiers: string[]) {
    const nfts = await this.apiService.getNftsByIdentifiers(
      identifiers,
      0,
      'withOwner=true',
    );
    const nftsGrouped = nfts?.groupBy((asset) => asset.identifier);

    this.assetScamLoader.batchScamInfo(identifiers, nftsGrouped);

    return nftsGrouped;
  }
}