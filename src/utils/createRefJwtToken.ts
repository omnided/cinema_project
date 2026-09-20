import jwt from 'jsonwebtoken';

import { JwtPayload } from '../types/JwtPayload';

export const createRefJwtToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, process.env.REFJWT_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION,
  });
};
