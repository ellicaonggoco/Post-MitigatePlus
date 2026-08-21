const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!connStr) {
      if (process.env.NODE_ENV === 'production') {
        console.error('FATAL: MONGODB_URI environment variable is required in production!');
        process.exit(1);
      }
      console.warn('MONGODB_URI not set, using local development database');
    }
    console.log(`Connecting to MongoDB at: ${(connStr || 'mongodb://127.0.0.1:27017/mitigateplus').replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
    
    const conn = await mongoose.connect(connStr || 'mongodb://127.0.0.1:27017/mitigateplus', {
      serverSelectionTimeoutMS: 15000,
      family: 4,
      tls: true,
      tlsAllowInvalidCertificates: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`MongoDB Connection Warning: ${error.message}`);
    console.warn(`System will proceed with memory cache fallback mode if Mongo server is unreachable during dev testing.`);
    return null;
  }
};

module.exports = connectDB;
