import { config } from 'dotenv';
import { DeleteResult, InsertResult, UpdateResult } from 'typeorm';

config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

export const getEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: '${name}`);
  }
  return value;
};

// Credit: https://stackoverflow.com/questions/47792808/typeorm-update-item-and-return-it
export const mutationReturn = async <T>(
  mutation: Promise<UpdateResult | DeleteResult | InsertResult>,
): Promise<T> => {
  const result = await mutation;
  return result.raw[0];
};
