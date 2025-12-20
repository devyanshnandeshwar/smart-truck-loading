import mongoose from 'mongoose';

// Maintain a single shared connection across the API process.
export const connectDB = async (mongoUri: string) => {
	if (!mongoUri) {
		throw new Error('MONGODB_URI is not configured');
	}

	await mongoose.connect(mongoUri);
	return mongoose.connection;
};
