import { Request, Response, NextFunction } from 'express';

import { CustomError } from 'utils/response/custom-error/CustomError';

import { UserRole } from '../orm/entities/users/types';

export const checkRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Берем данные из jwtPayload, куда их только что положил checkJwt
    const user = req.jwtPayload;

    if (!user || !user.role) {
      return next(new CustomError(403, 'General', 'Роль пользователя не найдена'));
    }

    if (!allowedRoles.includes(user.role as UserRole)) {
      return next(new CustomError(403, 'General', 'Доступ запрещен. Недостаточно прав.'));
    }

    next();
  };
};
