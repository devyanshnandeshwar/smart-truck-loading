import type { Request, Response } from 'express';
import { Shipment, ShipmentStatus } from '../models/shipment.model';

type UserRole = 'WAREHOUSE' | 'DEALER';

interface AuthenticatedRequest extends Request {
  userId?: string;
  role?: UserRole;
}

interface ValidatedShipmentPayload {
  weight: number;
  volume: number;
  destination: string;
  deadline: Date;
}

const isPositiveNumber = (value: unknown): value is number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
  }

  return false;
};

const parseDeadline = (value: unknown): Date | null => {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    return null;
  }

  const candidate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
};

const validateShipmentPayload = (body: Record<string, unknown>) => {
  const errors: string[] = [];
  const payload: Partial<ValidatedShipmentPayload> = {};

  if (!isPositiveNumber(body.weight)) {
    errors.push('Weight must be a number greater than 0');
  } else {
    payload.weight = Number((body.weight as number) ?? 0);
  }

  if (!isPositiveNumber(body.volume)) {
    errors.push('Volume must be a number greater than 0');
  } else {
    payload.volume = Number((body.volume as number) ?? 0);
  }

  if (typeof body.destination !== 'string' || body.destination.trim().length === 0) {
    errors.push('Destination is required');
  } else {
    payload.destination = body.destination.trim();
  }

  const deadline = parseDeadline(body.deadline ?? body.date ?? null);
  if (!deadline) {
    errors.push('Deadline must be a valid ISO date string');
  } else {
    payload.deadline = deadline;
  }

  return { errors, payload };
};

export const createShipment = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.role !== 'WAREHOUSE') {
    return res.status(403).json({ message: 'Only warehouse users can create shipments' });
  }

  const { errors, payload } = validateShipmentPayload(req.body as Record<string, unknown>);

  if (errors.length > 0 || !payload.weight || !payload.volume || !payload.destination || !payload.deadline) {
    return res.status(400).json({ message: 'Validation failed', details: errors });
  }

  try {
    const shipment = await Shipment.create({
      warehouseId: req.userId,
      weight: payload.weight,
      volume: payload.volume,
      destination: payload.destination,
      deadline: payload.deadline,
      status: ShipmentStatus.PENDING,
      isOptimized: false,
    });

    return res.status(201).json({ shipment });
  } catch (error) {
    console.error('CreateShipmentError', error);
    return res.status(500).json({ message: 'Unable to create shipment at this time' });
  }
};

export const listShipments = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.role !== 'WAREHOUSE') {
    return res.status(403).json({ message: 'Only warehouse users can view shipments' });
  }

  try {
    const shipments = await Shipment.find({ warehouseId: req.userId })
      .sort({ createdAt: -1 })
      .select(['status', 'weight', 'volume', 'destination', 'deadline']);

    return res.status(200).json({ shipments });
  } catch (error) {
    console.error('ListShipmentsError', error);
    return res.status(500).json({ message: 'Unable to fetch shipments at this time' });
  }
};
