import { User } from '../users/user.model';
import type { SafeUser, UserDocument } from '../users/user.types';
import type { LoginInput, RegisterInput } from './auth.validators';
import { createTokenPair, type TokenPair } from './token.service';

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

const sanitizeUser = (user: UserDocument): SafeUser => {
  const { password, ...safeUser } = user.toObject();
  return safeUser as SafeUser;
};

const buildTokenPayload = (user: UserDocument) => ({
  userId: user._id.toString(),
  role: user.role,
});

export const findUserByEmail = (email: string) => {
  return User.findOne({ email });
};

export const registerUser = async (payload: RegisterInput): Promise<SafeUser> => {
  const user = await User.create(payload);
  return sanitizeUser(user);
};

export interface LoginResult {
  user: SafeUser;
  tokens: TokenPair;
}

export const loginUser = async ({ email, password }: LoginInput): Promise<LoginResult> => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new InvalidCredentialsError();
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new InvalidCredentialsError();
  }

  const safeUser = sanitizeUser(user);
  const tokens = createTokenPair(buildTokenPayload(user));

  return { user: safeUser, tokens };
};
