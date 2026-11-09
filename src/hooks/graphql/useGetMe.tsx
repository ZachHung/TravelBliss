import { NetworkStatus } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { GET_ME } from '@/graphql/queries/me';

const useGetMe = () => {
  const { loading, data, refetch, networkStatus } = useQuery(GET_ME, {
    notifyOnNetworkStatusChange: true,
  });

  const isRefetching = networkStatus === NetworkStatus.refetch;

  return { isLoading: loading, data, refetch, isRefetching };
};

export default useGetMe;
