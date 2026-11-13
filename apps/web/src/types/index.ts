import type { ErrorLike } from '@apollo/client';

export type MutationHookProps<TData> = Partial<{
  onCompleted: (data: TData) => void;
  onError: (error: ErrorLike) => void;
}>;
