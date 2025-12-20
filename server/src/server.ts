import dotenv from 'dotenv';
import { app } from './app';
import { connectDB } from './config/db';

dotenv.config();

const PORT = Number(process.env.PORT) || 5001;
const MONGODB_URI = process.env.MONGODB_URI ?? '';

const startServer = async () => {
  try {
    await connectDB(MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

void startServer();
