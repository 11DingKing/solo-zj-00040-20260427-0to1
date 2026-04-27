import mongoose from "mongoose";
import { env } from "../config";

let isConnected = false;

export const connectMongoDB = async (): Promise<void> => {
  if (isConnected) {
    console.log("MongoDB is already connected");
    return;
  }

  try {
    const conn = await mongoose.connect(env.mongodbUri);
    isConnected = conn.connections[0].readyState === 1;
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

export const disconnectMongoDB = async (): Promise<void> => {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log("MongoDB disconnected");
};
