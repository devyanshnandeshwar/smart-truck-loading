import { HydratedDocument, Model } from 'mongoose';

export enum UserRole {
  WAREHOUSE = 'WAREHOUSE',
  DEALER = 'DEALER',
}

export interface BaseUser {
  email: string;
  password: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WarehouseUser extends BaseUser {
  role: UserRole.WAREHOUSE;
  companyName: string;
  managerName: string;
  location: string;
}

export interface DealerUser extends BaseUser {
  role: UserRole.DEALER;
  truckTypes: string[];
  serviceAreas: string[];
}

export type AnyUser = WarehouseUser | DealerUser;

export interface UserInstanceMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export type UserDocument = HydratedDocument<AnyUser, UserInstanceMethods>;
export type WarehouseUserDocument = HydratedDocument<WarehouseUser, UserInstanceMethods>;
export type DealerUserDocument = HydratedDocument<DealerUser, UserInstanceMethods>;

export type UserModel = Model<AnyUser, object, UserInstanceMethods>;
