import type { Request, Response } from 'express';
import { Shipment, ShipmentStatus } from '../models/shipment.model';

type UserRole = 'WAREHOUSE' | 'DEALER';

interface AuthenticatedRequest extends Request {
  userId?: string;
  role?: UserRole;
  body: Record<string, unknown>;
  params: Record<string, string>;
}

interface ValidatedShipmentPayload {
  weight: number;
  volume: number;
  destination: string;
  deadline: Date;
}

type ShipmentUpdatePayload = Partial<ValidatedShipmentPayload> & {
  status?: ShipmentStatus;
};

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

const statusFlow: ShipmentStatus[] = [
  ShipmentStatus.PENDING,
  ShipmentStatus.OPTIMIZED,
  ShipmentStatus.BOOKED,
  ShipmentStatus.IN_TRANSIT,
];

const isValidStatusTransition = (current: ShipmentStatus, next: ShipmentStatus) => {
  const currentIndex = statusFlow.indexOf(current);
  const nextIndex = statusFlow.indexOf(next);

  if (currentIndex === -1 || nextIndex === -1) {
    return false;
  }

  return nextIndex === currentIndex + 1;
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

export const getShipmentMetrics = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.role !== 'WAREHOUSE') {
    return res.status(403).json({ message: 'Only warehouse users can view shipment metrics' });
  }

  const filter = { warehouseId: req.userId };

  try {
    const [totalShipments, optimizedShipments, pendingShipments] = await Promise.all([
      Shipment.countDocuments(filter),
      Shipment.countDocuments({ ...filter, status: ShipmentStatus.OPTIMIZED }),
      Shipment.countDocuments({ ...filter, status: ShipmentStatus.PENDING }),
    ]);

    const optimizationPercentage = totalShipments === 0 ? 0 : Number(((optimizedShipments / totalShipments) * 100).toFixed(2));

    return res.status(200).json({
      metrics: {
        totalShipments,
        optimizedShipments,
        pendingShipments,
        optimizationPercentage,
      },
    });
  } catch (error) {
    console.error('ShipmentMetricsError', error);
    return res.status(500).json({ message: 'Unable to fetch shipment metrics at this time' });
  }
};

const validatePartialShipment = (body: Record<string, unknown>) => {
  const updates: ShipmentUpdatePayload = {};
  const errors: string[] = [];

  if (body.weight !== undefined) {
    if (!isPositiveNumber(body.weight)) {
      errors.push('Weight must be greater than 0');
    } else {
      updates.weight = Number(body.weight);
    }
  }

  if (body.volume !== undefined) {
    if (!isPositiveNumber(body.volume)) {
      errors.push('Volume must be greater than 0');
    } else {
      updates.volume = Number(body.volume);
    }
  }

  if (body.destination !== undefined) {
    if (typeof body.destination !== 'string' || body.destination.trim().length === 0) {
      errors.push('Destination must be a non-empty string');
    } else {
      updates.destination = body.destination.trim();
    }
  }

  if (body.deadline !== undefined) {
    const deadline = parseDeadline(body.deadline);
    if (!deadline) {
      errors.push('Deadline must be a valid ISO date string');
    } else {
      updates.deadline = deadline;
    }
  }

  if (body.status !== undefined) {
    if (typeof body.status !== 'string') {
      errors.push('Status must be a string value');
    } else if (!Object.values(ShipmentStatus).includes(body.status as ShipmentStatus)) {
      errors.push('Status must be one of Pending, Optimized, Booked, In Transit');
    } else {
      updates.status = body.status as ShipmentStatus;
    }
  }

  return { errors, updates };
};

export const updateShipment = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.role !== 'WAREHOUSE') {
    return res.status(403).json({ message: 'Only warehouse users can update shipments' });
  }

  const shipmentId = req.params.id;
  const { errors, updates } = validatePartialShipment(req.body as Record<string, unknown>);

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', details: errors });
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No valid fields provided for update' });
  }

  try {
    const shipment = await Shipment.findOne({ _id: shipmentId, warehouseId: req.userId });

    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    if (updates.status && !isValidStatusTransition(shipment.status, updates.status)) {
      return res.status(400).json({
        message: 'Invalid status transition',
        details: [`Cannot move from ${shipment.status} to ${updates.status}`],
      });
    }

    Object.assign(shipment, updates);
    await shipment.save();

    return res.status(200).json({ shipment });
  } catch (error) {
    console.error('UpdateShipmentError', error);
    return res.status(500).json({ message: 'Unable to update shipment at this time' });
  }
};

export const deleteShipment = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.role !== 'WAREHOUSE') {
    return res.status(403).json({ message: 'Only warehouse users can delete shipments' });
  }

  const shipmentId = req.params.id;

  try {
    const shipment = await Shipment.findOne({ _id: shipmentId, warehouseId: req.userId });

    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    if (shipment.status === ShipmentStatus.IN_TRANSIT) {
      return res.status(400).json({ message: 'Cannot delete a shipment that is already in transit' });
    }

    await shipment.deleteOne();

    return res.status(204).send();
  } catch (error) {
    console.error('DeleteShipmentError', error);
    return res.status(500).json({ message: 'Unable to delete shipment at this time' });
  }
};
