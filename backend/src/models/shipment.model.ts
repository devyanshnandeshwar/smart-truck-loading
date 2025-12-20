import { Schema, Types, model, type Document, type Model } from 'mongoose';

export enum ShipmentStatus {
  PENDING = 'Pending',
  OPTIMIZED = 'Optimized',
  BOOKED = 'Booked',
  IN_TRANSIT = 'In Transit',
}

export interface Shipment {
  warehouseId: Types.ObjectId;
  weight: number;
  volume: number;
  destination: string;
  deadline: Date;
  status: ShipmentStatus;
  isOptimized: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ShipmentDocument = Shipment & Document;

export type ShipmentModel = Model<ShipmentDocument>;

const shipmentSchema = new Schema<ShipmentDocument>(
  {
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
    },
    volume: {
      type: Number,
      required: true,
      min: 0,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ShipmentStatus),
      default: ShipmentStatus.PENDING,
    },
    isOptimized: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

shipmentSchema.index({ warehouseId: 1 });

export const Shipment = model<ShipmentDocument, ShipmentModel>('Shipment', shipmentSchema);
