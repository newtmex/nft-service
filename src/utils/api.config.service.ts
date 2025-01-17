import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiConfigService {
  constructor(private readonly configService: ConfigService) {}

  private getGenericConfig<T>(path: string, alias?: string): T {
    const value = this.configService.get<T>(path);
    if (!value) {
      throw new Error(`No '${alias || path}' config present`);
    }
    return value;
  }

  getMongoDbUrl(): string {
    return this.getGenericConfig<string>('NFT_TRAIT_SUMMARIES_DB_URL');
  }

  getMongoDbName(): string {
    return this.getGenericConfig<string>('NFT_TRAIT_SUMMARIES_DB_DATABASE');
  }

  getMongoDbUsername(): string {
    return this.getGenericConfig<string>('NFT_TRAIT_SUMMARIES_DB_USERNAME');
  }

  getMongoDbPassword(): string {
    return this.getGenericConfig<string>('NFT_TRAIT_SUMMARIES_DB_PASSWORD');
  }

  isReindexMarketplaceEventsFlagActive(): boolean {
    return (
      this.getGenericConfig<string>('ENABLE_MARKETPLACE_EVENTS') === 'true'
    );
  }

  getApiUrl(): string {
    return this.getGenericConfig<string>('ELROND_API');
  }

  getToolsUrl(): string {
    return this.getGenericConfig<string>('ELROND_TOOLS');
  }

  getKeepAliveTimeoutDownstream(): number {
    return parseInt(
      this.getGenericConfig<string>('KEEPALIVE_TIMEOUT_DOWNSTREAM'),
    );
  }

  getSecurityAdmins(): string[] {
    return this.getGenericConfig<string[]>('ADMINS');
  }

  getJwtSecret(): string {
    return this.getGenericConfig<string>('JWT_SECRET_KEY');
  }

  getExtrasApiUrl(): string {
    return this.getGenericConfig<string>('MX_EXTRAS_API');
  }
}
