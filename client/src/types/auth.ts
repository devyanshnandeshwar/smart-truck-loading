export type UserRole = 'WAREHOUSE' | 'DEALER';

export interface SafeUser {
  _id?: string;
  email: string;
  role: UserRole;
  companyName?: string;
  managerName?: string;
  location?: string;
  truckTypes?: string[];
  serviceAreas?: string[];
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: UserRole;
  companyName?: string;
  managerName?: string;
  location?: string;
  truckTypes?: string[];
  serviceAreas?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: SafeUser;
  tokens: TokenPair;
}

export interface RegisterResponse {
  user: SafeUser;
}
