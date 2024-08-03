import { NetworkStatus, useQuery } from '@apollo/client';
import { GetMeQuery } from '@generated/codegen/graphql';
import { GET_ME } from '@/graphql/queries/me';

type UseGetMeProps = {
  onCompleted?: (data: GetMeQuery) => void;
};

const useGetMe = ({ onCompleted }: UseGetMeProps) => {
  const { loading, data, refetch, networkStatus } = useQuery(GET_ME, {
    onCompleted,
    notifyOnNetworkStatusChange: true,
  });

  const isRefetching = networkStatus === NetworkStatus.refetch;

  return { isLoading: loading, data, refetch, isRefetching };
};

export default useGetMe;
