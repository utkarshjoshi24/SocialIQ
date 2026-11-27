import mongoose from 'mongoose';

/**
 * Connect to MongoDB database
 */
export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/socialiq';
    const conn = await mongoose.connect(mongoUri);
    console.log(`[SocialIQ MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[SocialIQ MongoDB Error] ${error.message}`);
    process.exit(1);
  }
};
