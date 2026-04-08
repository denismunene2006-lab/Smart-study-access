import mongoose from "mongoose";
import { config } from "./config.js";

mongoose.set("strictQuery", true);
mongoose.set("bufferCommands", false);

let connectPromise = null;

function formatDatabaseError(error) {
  if (error?.cause?.message) {
    return error.cause.message;
  }

  if (Array.isArray(error?.errors) && error.errors.length > 0) {
    return error.errors
      .map((item) => item?.message || item?.code || String(item))
      .filter(Boolean)
      .join("; ");
  }

  return error?.message || error?.code || "Unknown MongoDB connection error.";
}

function buildConnectionOptions() {
  const options = {
    serverSelectionTimeoutMS: config.mongodbServerSelectionTimeoutMs,
    appName: "embu-past-papers-api"
  };

  if (config.mongodbDbName) {
    options.dbName = config.mongodbDbName;
  }

  return options;
}

export async function connectToDatabase() {
  if (!config.databaseConfigured) {
    const error = new Error("MongoDB is not configured.");
    error.statusCode = 503;
    throw error;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = mongoose.connect(config.mongodbUri, buildConnectionOptions())
    .then(() => mongoose.connection)
    .catch((error) => {
      connectPromise = null;
      throw error;
    });

  const connection = await connectPromise;
  connectPromise = null;
  return connection;
}

export async function checkDatabaseConnection() {
  if (!config.databaseConfigured) {
    return {
      status: "not_configured",
      ready: false,
      source: null,
      error: "Set MONGODB_URI to your MongoDB Atlas or MongoDB server connection string."
    };
  }

  try {
    await connectToDatabase();
    await mongoose.connection.db.admin().ping();
    return {
      status: "ok",
      ready: true,
      source: config.databaseConfigSource,
      databaseName: mongoose.connection.name
    };
  } catch (error) {
    return {
      status: "error",
      ready: false,
      source: config.databaseConfigSource,
      error: formatDatabaseError(error)
    };
  }
}

export async function closeDatabaseConnection() {
  connectPromise = null;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}
