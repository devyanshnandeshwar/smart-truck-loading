import dotenv from 'dotenv';
import { app } from './app';
import { connectDB } from './config/db';

dotenv.config();

const PORT = Number(process.env.PORT) || 5001;
const DATABASE_URI = process.env.MONGODB_URI ?? process.env.MONGO_URI ?? '';

const startServer = async () => {
  try {
    await connectDB(DATABASE_URI);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

void startServer();
