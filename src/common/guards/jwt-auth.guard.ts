import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenExpiredException } from '../exceptions/app.exceptions';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: Error | null, user: TUser, info: { name?: string } | null): TUser {
    if (info?.name === 'TokenExpiredError') {
      throw new TokenExpiredException();
    }
    if (err || !user) {
      throw err || new TokenExpiredException();
    }
    return user;
  }
}