import { User } from '@/graphql/codegen/graphql';

export type SerializedUser = Omit<User, '__typename' | 'createdAt' | 'updatedAt'>;
