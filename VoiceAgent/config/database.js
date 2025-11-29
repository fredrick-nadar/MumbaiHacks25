/**
 * Database Configuration - MongoDB Connection for VoiceAgent
 */

import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDB() {
  try {
    const mongoUri = config.mongodb?.uri || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.log('⚠️  No MongoDB URI found. Running in memory-only mode.');
      return null;
    }

    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('🍃 MongoDB Connected:', conn.connection.host);
    console.log('📊 Database:', conn.connection.name);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected - auto-reconnecting...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⚠️  VoiceAgent will run in memory-only mode');
    return null;
  }
}

export default connectDB;
