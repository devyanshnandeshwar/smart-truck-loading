import { z } from 'zod';
import { UserRole } from '../users';

const baseAuthSchema = z.object({
  email: z.string().email({ message: 'A valid email address is required' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
});

const warehouseFields = z.object({
  role: z.literal(UserRole.WAREHOUSE),
  companyName: z.string().min(1, { message: 'companyName is required' }),
  managerName: z.string().min(1, { message: 'managerName is required' }),
  location: z.string().min(1, { message: 'location is required' }),
});

const dealerFields = z.object({
  role: z.literal(UserRole.DEALER),
  truckTypes: z
    .array(z.string().min(1, { message: 'truckTypes entries must be non-empty strings' }))
    .min(1, { message: 'At least one truck type is required' }),
  serviceAreas: z
    .array(z.string().min(1, { message: 'serviceAreas entries must be non-empty strings' }))
    .min(1, { message: 'At least one service area is required' }),
});

export const registerSchema = z.union([
  baseAuthSchema.merge(warehouseFields),
  baseAuthSchema.merge(dealerFields),
]);

export type RegisterInput = z.infer<typeof registerSchema>;
