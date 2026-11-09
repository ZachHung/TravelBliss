import { useMutation } from '@apollo/client/react';
import { type LogOutMutation } from '@generated/codegen/graphql';
import { LOGOUT } from '@/graphql/mutations/logout';
import { type MutationHookProps } from '@/types';

const useLogout = ({ onCompleted }: MutationHookProps<LogOutMutation>) => {
  const [login, result] = useMutation(LOGOUT, {
    onCompleted,
    notifyOnNetworkStatusChange: true,
  });

  return { login, result };
};

export default useLogout;
