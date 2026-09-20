import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { CustomError } from '../utils/response/custom-error/CustomError';

export const checkJwt = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    return next(new CustomError(401, 'General', 'Authorization header not provided'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const jwtPayload = jwt.verify(token, process.env.JWT_SECRET as string) as any;

    ['iat', 'exp'].forEach((key) => delete jwtPayload[key]);

    req.jwtPayload = jwtPayload;

    return next();
  } catch (err) {
    return next(new CustomError(401, 'Raw', 'Невалидный или просроченный токен', null, err));
  }
};
