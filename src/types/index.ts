import { ApolloError, BaseMutationOptions } from '@apollo/client';

export type Serialized<T> = Omit<T, 'createdAt' | 'updatedAt'>;
export type MutationHookProps<TData> = Partial<{
  onCompleted: (data: TData, clientOptions?: BaseMutationOptions) => void;
  onError: (error: ApolloError, clientOptions?: BaseMutationOptions) => void;
}>;

export enum ErrorsCodes {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_EXISTED = 'USER_EXISTED',
  WRONG_PASSWORD = 'WRONG_PASSWORD',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_COOKIES = 'INVALID_COOKIES',
}
