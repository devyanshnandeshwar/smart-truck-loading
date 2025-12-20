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

export type UserDocument = HydratedDocument<AnyUser>;
export type WarehouseUserDocument = HydratedDocument<WarehouseUser>;
export type DealerUserDocument = HydratedDocument<DealerUser>;

export type UserModel = Model<AnyUser>;
