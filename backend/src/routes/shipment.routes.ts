import { Router } from 'express';
import {
	createShipment,
	deleteShipment,
	getShipmentMetrics,
	listShipments,
	updateShipment,
} from '../controllers/shipment.controller';

const router = Router();

router.post('/api/shipments', createShipment);
router.get('/api/shipments', listShipments);
router.get('/api/shipments/metrics', getShipmentMetrics);
router.put('/api/shipments/:id', updateShipment);
router.delete('/api/shipments/:id', deleteShipment);

export const shipmentRouter = router;
