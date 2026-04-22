const mongoose = require("mongoose");
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE) || 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
    });
    isConnected = true;
    console.log("MongoDB Connected:", conn.connection.host);
    console.log("Pool Size:", process.env.MONGO_POOL_SIZE || 10);

    mongoose.connection.on("disconnected", () => { isConnected = false; console.log("MongoDB disconnected, retrying..."); });
    mongoose.connection.on("error", err => console.error("MongoDB error:", err.message));

    process.on("SIGINT",  async () => { await mongoose.connection.close(); process.exit(0); });
    process.on("SIGTERM", async () => { await mongoose.connection.close(); process.exit(0); });
  } catch (err) {
    console.error("MongoDB failed:", err.message);
    process.exit(1);
  }
};
module.exports = connectDB;
