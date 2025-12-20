import { Router } from 'express';
import { createShipment, listShipments } from '../controllers/shipment.controller';

const router = Router();

router.post('/api/shipments', createShipment);
router.get('/api/shipments', listShipments);

export const shipmentRouter = router;
