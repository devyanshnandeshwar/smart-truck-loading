import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { authRouter } from './modules/auth';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

export { app };
