import { useMutation } from '@apollo/client';
import { LoginMutation } from '@generated/codegen/graphql';
import { LOGIN } from '@/graphql/mutations/login';
import { MutationHookProps } from '@/types';

const useLogin = ({ onCompleted, onError }: MutationHookProps<LoginMutation>) => {
  const [login, result] = useMutation(LOGIN, {
    onCompleted,
    onError,
    notifyOnNetworkStatusChange: true,
  });

  return { login, result };
};

export default useLogin;
