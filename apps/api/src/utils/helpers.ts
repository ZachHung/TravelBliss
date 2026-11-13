import { resolve } from 'path';
import { config } from 'dotenv';
import { type DeleteResult, type InsertResult, type UpdateResult } from 'typeorm';

// Same files and precedence as Vite, read from the repo root (src/utils and dist/utils are both 4 levels deep).
// Missing files are skipped, so deploys can rely on real env vars alone.
const root = resolve(__dirname, '../../../..');
process.env.NODE_ENV ||= 'development';
const mode = process.env.NODE_ENV;
config({
  path: [`.env.${mode}.local`, `.env.${mode}`, '.env.local', '.env'].map((file) =>
    resolve(root, file)
  ),
  quiet: true,
});

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
