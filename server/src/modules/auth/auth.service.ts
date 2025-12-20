import { User } from '../users/user.model';
import type { SafeUser } from '../users/user.types';
import type { RegisterInput } from './auth.validators';

export const findUserByEmail = (email: string) => {
  return User.findOne({ email });
};

export const registerUser = async (payload: RegisterInput): Promise<SafeUser> => {
  const user = await User.create(payload);
  const { password, ...safeUser } = user.toObject();
  return safeUser;
};
