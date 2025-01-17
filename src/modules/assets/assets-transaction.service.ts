import {
  Address,
  AddressValue,
  BytesValue,
  ContractFunction,
  TokenPayment,
  U64Value,
} from '@elrondnetwork/erdjs';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MxApiService, getSmartContract, RedisCacheService } from 'src/common';
import { cacheConfig, mxConfig, gas } from 'src/config';
import {
  getCollectionAndNonceFromIdentifier,
  timestampToEpochAndRound,
} from 'src/utils/helpers';
import '../../utils/extensions';
import { nominateVal } from '../../utils/formatters';
import { FileContent } from '../ipfs/file.content';
import { PinataService } from '../ipfs/pinata.service';
import { S3Service } from '../s3/s3.service';
import BigNumber from 'bignumber.js';
import { TransactionNode } from '../common/transaction';
import {
  UpdateQuantityRequest,
  CreateNftRequest,
  TransferNftRequest,
} from './models/requests';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import * as Redis from 'ioredis';
import { TimeConstants } from 'src/utils/time-utils';
import { MxStats } from 'src/common/services/mx-communication/models/mx-stats.model';

@Injectable()
export class AssetsTransactionService {
  private redisClient: Redis.Redis;

  constructor(
    private pinataService: PinataService,
    private s3Service: S3Service,
    private mxApiService: MxApiService,
    private readonly logger: Logger,
    private redisCacheService: RedisCacheService,
  ) {
    this.redisClient = this.redisCacheService.getClient(
      cacheConfig.persistentRedisClientName,
    );
  }

  async updateQuantity(
    ownerAddress: string,
    request: UpdateQuantityRequest,
  ): Promise<TransactionNode> {
    const { collection, nonce } = getCollectionAndNonceFromIdentifier(
      request.identifier,
    );
    const contract = getSmartContract(request.updateQuantityRoleAddress);
    const transaction = contract.call({
      func: new ContractFunction(request.functionName),
      value: TokenPayment.egldFromAmount(0),
      args: [
        BytesValue.fromUTF8(collection),
        BytesValue.fromHex(nonce),
        new U64Value(new BigNumber(request.quantity)),
      ],
      gasLimit: gas.addBurnQuantity,
      chainID: mxConfig.chainID,
    });
    return transaction.toPlainObject(new Address(ownerAddress));
  }

  async burnQuantity(
    ownerAddress: string,
    request: UpdateQuantityRequest,
  ): Promise<TransactionNode> {
    const [nft, mxStats] = await Promise.all([
      this.mxApiService.getNftByIdentifier(request.identifier),
      this.getOrSetAproximateMxStats(),
    ]);

    if (!nft) {
      throw new NotFoundException('NFT not found');
    }

    const [epoch] = timestampToEpochAndRound(
      nft.timestamp,
      mxStats.epoch,
      mxStats.roundsPassed,
      mxStats.roundsPerEpoch,
      mxStats.refreshRate,
    );

    if (epoch > mxConfig.burnNftActivationEpoch) {
      return await this.updateQuantity(ownerAddress, request);
    }

    return await this.transferNft(
      ownerAddress,
      new TransferNftRequest({
        identifier: request.identifier,
        quantity: request.quantity,
        destinationAddress: mxConfig.burnAddress,
      }),
    );
  }

  async createNft(
    ownerAddress: string,
    request: CreateNftRequest,
  ): Promise<TransactionNode> {
    const file = await request.file;
    const fileData = await this.pinataService.uploadFile(file);
    const fileMetadata = new FileContent({
      description: request.attributes.description,
    });
    const assetMetadata = await this.pinataService.uploadText(fileMetadata);

    await this.s3Service.upload(file, fileData.hash);
    await this.s3Service.uploadText(fileMetadata, assetMetadata.hash);

    const attributes = `tags:${request.attributes.tags};metadata:${assetMetadata.hash}`;

    const contract = getSmartContract(ownerAddress);
    const transaction = contract.call({
      func: new ContractFunction('ESDTNFTCreate'),
      value: TokenPayment.egldFromAmount(0),
      args: [
        BytesValue.fromUTF8(request.collection),
        new U64Value(new BigNumber(request.quantity)),
        BytesValue.fromUTF8(request.name),
        BytesValue.fromHex(nominateVal(parseFloat(request.royalties))),
        BytesValue.fromUTF8(fileData.hash),
        BytesValue.fromUTF8(attributes),
        BytesValue.fromUTF8(fileData.url),
      ],
      gasLimit: gas.nftCreate,
      chainID: mxConfig.chainID,
    });
    let response = transaction.toPlainObject(new Address(ownerAddress));

    return {
      ...response,
      gasLimit: gas.nftCreate + response.data.length * mxConfig.pricePerByte,
      chainID: mxConfig.chainID,
    };
  }

  async transferNft(
    ownerAddress: string,
    transferRequest: TransferNftRequest,
  ): Promise<TransactionNode> {
    const { collection, nonce } = getCollectionAndNonceFromIdentifier(
      transferRequest.identifier,
    );
    const contract = getSmartContract(ownerAddress);
    const transaction = contract.call({
      func: new ContractFunction('ESDTNFTTransfer'),
      value: TokenPayment.egldFromAmount(0),
      args: [
        BytesValue.fromUTF8(collection),
        BytesValue.fromHex(nonce),
        new U64Value(new BigNumber(transferRequest.quantity)),
        new AddressValue(new Address(transferRequest.destinationAddress)),
      ],
      gasLimit: gas.nftTransfer,
      chainID: mxConfig.chainID,
    });
    let response = transaction.toPlainObject(new Address(ownerAddress));
    response.gasLimit = Math.max(
      mxConfig.transferMinCost + response.data.length * mxConfig.pricePerByte,
      gas.nftTransfer,
    );
    return {
      ...response,
      chainID: mxConfig.chainID,
    };
  }

  private async getOrSetAproximateMxStats(): Promise<MxStats> {
    try {
      const cacheKey = this.getApproximateMxStatsCacheKey();
      const getMxStats = () => this.mxApiService.getMxStats();
      return this.redisCacheService.getOrSet(
        this.redisClient,
        cacheKey,
        getMxStats,
        TimeConstants.oneDay,
      );
    } catch (error) {
      this.logger.error('An error occurred while getting mx stats', {
        path: `${AssetsTransactionService.name}.${this.getOrSetAproximateMxStats.name}`,
        exception: error,
      });
    }
  }

  private getApproximateMxStatsCacheKey() {
    return generateCacheKeyFromParams('assets', 'approximateMxStats');
  }
}
