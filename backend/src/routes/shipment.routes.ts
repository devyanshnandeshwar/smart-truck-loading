import { Router } from 'express';
import { createShipment } from '../controllers/shipment.controller';

const router = Router();

router.post('/api/shipments', createShipment);

export const shipmentRouter = router;
