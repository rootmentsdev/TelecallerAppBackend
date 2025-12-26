import mongoose from 'mongoose';

let isConnected = false;

const connectDB = async () => {
  try {
    if (isConnected) {
      return;
    }

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log("✅ MongoDB Connected (singleton)");

  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    throw err;
  }
};

export default connectDB;
