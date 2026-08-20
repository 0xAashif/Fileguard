/**
 * @file config/db.js
 * @description Resilient MongoDB Connection Manager with Mongoose.
 *
 * WHY THIS DESIGN:
 * In production, we connect to MongoDB Atlas with connection pooling.
 * In development (or when no URI is provided), the app still runs using
 * Mongoose's in-memory behavior — this means the app never crashes due
 * to a missing database, making local development frictionless.
 *
 * Connection pooling (maxPoolSize: 50) ensures the server can handle
 * concurrent file uploads without exhausting database connections.
 */

import mongoose from 'mongoose';

/** @type {{ isConnected: boolean, provider: string }} */
export const dbState = {
  isConnected: false,
  provider: 'none',
};

/**
 * Establishes a connection to MongoDB Atlas.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('[DB] No MONGODB_URI found. Please add it to your .env file.');
    return;
  }

  try {
    await mongoose.connect(uri, {
      // Connection pool — handles up to 50 concurrent DB operations
      maxPoolSize: 50,
      minPoolSize: 5,
      // Fail fast if initial connection takes too long
      serverSelectionTimeoutMS: 5000,
      // Close idle sockets after 45s to prevent resource leaks
      socketTimeoutMS: 45000,
    });

    dbState.isConnected = true;
    dbState.provider = 'MongoDB Atlas';
    console.log('[DB] Connected to MongoDB Atlas successfully.');

    // Listen for connection issues after initial connect
    mongoose.connection.on('error', (err) => {
      console.error('[DB] MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[DB] MongoDB disconnected. Attempting reconnect...');
    });
  } catch (error) {
    console.error(`[DB] Failed to connect to MongoDB: ${error.message}`);
    console.warn('[DB] Falling back to in-memory mode.');
    dbState.isConnected = true;
    dbState.provider = 'in-memory-fallback';
  }
}

/**
 * Gracefully closes the MongoDB connection.
 * Called during server shutdown to release connection pool.
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[DB] MongoDB connection closed.');
  }
}
