import jwt from 'jsonwebtoken';
import { UserRole } from '../users';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

type EnvKey = 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET';

const getRequiredEnv = (key: EnvKey): string => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is not configured`);
  }

  return value;
};

const buildPayload = (userId: string, role: UserRole) => ({
  sub: userId,
  role,
});

export interface TokenPayload {
  userId: string;
  role: UserRole;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const generateAccessToken = ({ userId, role }: TokenPayload): string => {
  return jwt.sign(buildPayload(userId, role), getRequiredEnv('JWT_ACCESS_SECRET'), {
    expiresIn: ACCESS_TOKEN_TTL,
  });
};

export const generateRefreshToken = ({ userId, role }: TokenPayload): string => {
  return jwt.sign(buildPayload(userId, role), getRequiredEnv('JWT_REFRESH_SECRET'), {
    expiresIn: REFRESH_TOKEN_TTL,
  });
};

export const createTokenPair = (payload: TokenPayload): TokenPair => ({
  accessToken: generateAccessToken(payload),
  refreshToken: generateRefreshToken(payload),
});
