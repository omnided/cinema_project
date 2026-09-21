import { Request, Response, NextFunction } from 'express';

import { AuthDto } from 'dto/authDto';
import { UserService } from 'service/UserService';
import { CustomError } from 'utils/response/custom-error/CustomError';

export class AuthController {
  constructor(private UserService: UserService) {}
  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
    });
  }
  public async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new CustomError(400, 'General', 'Пожалуйста, введите email и пароль');
      }

      const result = await this.UserService.login(email, password);

      this.setRefreshTokenCookie(res, result.refresh_token);

      return res.customSuccess(201, 'logging in', result);
    } catch (error: any) {
      res.clearCookie('refresh_token');
      return next(error);
    }
  }

  public async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Добавили name
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        throw new CustomError(400, 'General', 'Пожалуйста, заполните все поля');
      }

      const result = await this.UserService.register(email, username, password);

      this.setRefreshTokenCookie(res, result.refresh_token);

      return res.customSuccess(201, 'User registered', result);
    } catch (error: any) {
      res.clearCookie('refresh_token');
      return next(error);
    }
  }

  public async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refresh_token;
      if (!refreshToken) {
        throw new CustomError(401, 'General', 'Refresh token не предоставлен');
      }

      const result = await this.UserService.updateRefreshToken(refreshToken);

      this.setRefreshTokenCookie(res, result.refreshToken);

      return res.customSuccess(200, 'Token refreshed', { accessToken: result.accessToken });
    } catch (error: any) {
      res.clearCookie('refresh_token');
      return next(error);
    }
  }
}
