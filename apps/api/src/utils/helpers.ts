import { resolve } from 'path';
import { config } from 'dotenv';
import { type DeleteResult, type InsertResult, type UpdateResult } from 'typeorm';

// One file per environment at the repo root: .env.local (docker on this machine), .env.development (hosted dev).
// src/utils and dist/utils are both 4 levels deep. A missing file is skipped, so deploys can use real env vars.
process.env.NODE_ENV ||= 'development';
config({ path: resolve(__dirname, '../../../..', `.env.${process.env.NODE_ENV}`), quiet: true });

export const getEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: '${name}`);
  }
  return value;
};

// Credit: https://stackoverflow.com/questions/47792808/typeorm-update-item-and-return-it
export const mutationReturn = async <T>(
  mutation: Promise<UpdateResult | DeleteResult | InsertResult>
): Promise<T> => {
  const result = await mutation;
  return result.raw[0];
};
