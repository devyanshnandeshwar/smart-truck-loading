import bcrypt from 'bcrypt';
import { Schema, model } from 'mongoose';
import {
  AnyUser,
  DealerUserDocument,
  UserDocument,
  UserModel,
  UserRole,
  WarehouseUserDocument,
} from './user.types';

const BCRYPT_SALT_ROUNDS = 10;

// Role-aware helpers keep schema-level validation close to the data rules.
const isWarehouseRole = function (this: UserDocument): boolean {
  return this.role === UserRole.WAREHOUSE;
};

const isDealerRole = function (this: UserDocument): boolean {
  return this.role === UserRole.DEALER;
};

const warehouseStringValidator = (fieldLabel: string) => ({
  validator(this: WarehouseUserDocument | DealerUserDocument, value?: string) {
    if (this.role === UserRole.WAREHOUSE) {
      return typeof value === 'string' && value.trim().length > 0;
    }

    return value === undefined || value === null || value === '';
  },
  message: `${fieldLabel} is only valid for warehouse users`,
});

const dealerArrayValidator = (fieldLabel: string) => ({
  validator(this: WarehouseUserDocument | DealerUserDocument, value?: string[]) {
    if (this.role === UserRole.DEALER) {
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

const userSchema = new Schema<AnyUser, UserModel>(
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
      required: isWarehouseRole,
      validate: warehouseStringValidator('companyName'),
    },
    managerName: {
      type: String,
      trim: true,
      required: isWarehouseRole,
      validate: warehouseStringValidator('managerName'),
    },
    location: {
      type: String,
      trim: true,
      required: isWarehouseRole,
      validate: warehouseStringValidator('location'),
    },
    truckTypes: {
      type: [{ type: String, trim: true }],
      default: undefined,
      required: isDealerRole,
      validate: dealerArrayValidator('truckTypes'),
    },
    serviceAreas: {
      type: [{ type: String, trim: true }],
      default: undefined,
      required: isDealerRole,
      validate: dealerArrayValidator('serviceAreas'),
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 }, { unique: true });

// Hash credentials only when the password has changed to minimize CPU work.
userSchema.pre('save', async function (next) {
  const user = this as UserDocument;

  if (!user.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = model<AnyUser, UserModel>('User', userSchema);
