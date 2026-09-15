import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { AccessTokenGuard } from './access-token.guard.js';
import type { AuthenticatedRequest } from './access-token.guard.js';
import { AuthService } from './auth.service.js';
import { REFRESH_COOKIE_NAME } from './auth.types.js';
import type { AuthResponse, PublicUser } from './auth.types.js';
import { AuthResponseDto, LoginDto, PublicUserResponseDto } from './dto/login.dto.js';

type CookieRequest = {
  cookies?: Record<string, string | undefined>;
  header(name: string): string | undefined;
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.login(body.email, body.password);
    response.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      this.authService.getRefreshCookieOptions(),
    );
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME];
    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
      throw new UnauthorizedException('Sesión de refresh inválida.');
    }

    const result = await this.authService.refresh(refreshToken);
    response.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      this.authService.getRefreshCookieOptions(),
    );
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async logout(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME];
    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
      throw new UnauthorizedException('Sesión de refresh inválida.');
    }

    await this.authService.logout(refreshToken);
    response.clearCookie(REFRESH_COOKIE_NAME, this.authService.getRefreshCookieOptions());
  }

  @ApiBearerAuth()
  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiOkResponse({ type: PublicUserResponseDto })
  async me(@Req() request: AuthenticatedRequest): Promise<PublicUser> {
    return this.authService.me(request.user.sub);
  }
}
