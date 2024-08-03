import { useMutation } from '@apollo/client';
import { RegisterMutation } from '@generated/codegen/graphql';
import { REGISTER } from '@/graphql/mutations/register';
import { MutationHookProps } from '@/types';

const useRegister = ({ onCompleted, onError }: Partial<MutationHookProps<RegisterMutation>>) => {
  const [register, result] = useMutation(REGISTER, {
    onCompleted,
    onError,
    notifyOnNetworkStatusChange: true,
  });

  return { register, result };
};

export default useRegister;
