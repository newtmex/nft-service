import { NativeAuthServer } from '@elrondnetwork/native-auth-server';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ApiConfigService } from 'src/utils/api.config.service';
import { AuthUtils } from './auth.utils';

@Injectable()
export class NativeAuthGuard implements CanActivate {
  private readonly logger: Logger;
  private readonly authServer: NativeAuthServer;

  constructor(apiConfigService: ApiConfigService) {
    this.logger = new Logger(NativeAuthGuard.name);
    this.authServer = new NativeAuthServer({
      apiUrl: apiConfigService.getApiUrl(),
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let request = context.switchToHttp().getRequest();
    if (!request) {
      const ctx = GqlExecutionContext.create(context);
      request = ctx.getContext().req;
    }

    if (AuthUtils.bypassAuthorizationOnTestnet(request)) {
      return true;
    }

    const authorization: string = request.headers['authorization'];
    if (!authorization) {
      throw new UnauthorizedException();
    }
    const jwt = authorization.replace('Bearer ', '');

    try {
      const userInfo = await this.authServer.validate(jwt);

      request.res.set('X-Native-Auth-Issued', userInfo.issued);
      request.res.set('X-Native-Auth-Expires', userInfo.expires);
      request.res.set('X-Native-Auth-Address', userInfo.address);
      request.res.set(
        'X-Native-Auth-Timestamp',
        Math.round(new Date().getTime() / 1000),
      );

      request.auth = userInfo;

      return true;
    } catch (error: any) {
      this.logger.warn(error);
      return false;
    }
  }
}
