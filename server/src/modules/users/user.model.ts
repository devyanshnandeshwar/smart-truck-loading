import bcrypt from 'bcrypt';
import { Schema, model } from 'mongoose';
import {
  AnyUser,
  UserDocument,
  UserInstanceMethods,
  UserModel,
  UserRole,
} from './user.types';

const BCRYPT_SALT_ROUNDS = 10;

const warehouseStringValidator = (fieldLabel: string) => ({
  validator(this: unknown, value?: string) {
    const role = (this as AnyUser | undefined)?.role;
    if (role === UserRole.WAREHOUSE) {
      return typeof value === 'string' && value.trim().length > 0;
    }

    return value === undefined || value === null || value === '';
  },
  message: `${fieldLabel} is only valid for warehouse users`,
});

const dealerArrayValidator = (fieldLabel: string) => ({
  validator(this: unknown, value?: string[]) {
    const role = (this as AnyUser | undefined)?.role;
    if (role === UserRole.DEALER) {
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((entry) => typeof entry === 'string' && entry.trim().length > 0)
      );
    }

    return !value || value.length === 0;
  },
  message: `${fieldLabel} is only valid for dealer users`,
});

const userSchema = new Schema<AnyUser, UserModel, UserInstanceMethods>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },
    companyName: {
      type: String,
      trim: true,
      validate: warehouseStringValidator('companyName'),
    },
    managerName: {
      type: String,
      trim: true,
      validate: warehouseStringValidator('managerName'),
    },
    location: {
      type: String,
      trim: true,
      validate: warehouseStringValidator('location'),
    },
    truckTypes: {
      type: [{ type: String, trim: true }],
      default: undefined,
      validate: dealerArrayValidator('truckTypes'),
    },
    serviceAreas: {
      type: [{ type: String, trim: true }],
      default: undefined,
      validate: dealerArrayValidator('serviceAreas'),
    },
  } as Record<string, unknown>,
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 }, { unique: true });

// Hash credentials only when the password has changed to minimize CPU work.
userSchema.pre('save', async function () {
  const user = this as UserDocument;

  if (!user.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  user.password = await bcrypt.hash(user.password, salt);
});

userSchema.methods.comparePassword = async function (this: UserDocument, candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = model<AnyUser, UserModel>('User', userSchema);
