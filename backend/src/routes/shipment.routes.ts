import { Router } from 'express';
import {
	createShipment,
	deleteShipment,
	listShipments,
	updateShipment,
} from '../controllers/shipment.controller';

const router = Router();

router.post('/api/shipments', createShipment);
router.get('/api/shipments', listShipments);
router.put('/api/shipments/:id', updateShipment);
router.delete('/api/shipments/:id', deleteShipment);

export const shipmentRouter = router;
