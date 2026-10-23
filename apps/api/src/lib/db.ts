import mongoose from "mongoose";

mongoose.set("strictQuery", true);

export const connectDatabase = async (uri: string): Promise<typeof mongoose> => {
  const connection = await mongoose.connect(uri, {
    maxPoolSize: 50,
    serverSelectionTimeoutMS: 10_000,
  });
  await Promise.all(Object.values(connection.models).map((model) => model.syncIndexes()));
  return connection;
};

export const disconnectDatabase = (): Promise<void> => mongoose.disconnect();

export const isDatabaseReady = (): boolean => mongoose.connection.readyState === 1;
