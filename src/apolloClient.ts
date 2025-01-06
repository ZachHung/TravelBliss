import dayjs from 'dayjs';
import { ApolloClient, ApolloLink, createHttpLink, from, InMemoryCache } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
// import { REFRESH_TOKEN } from './graphql/mutations/refreshToken';
import { parseJwt } from './utils/helpers';

const REFRESH_TOKEN_LEGROOM = 30;

export function getTokenState(token?: string | null) {
  if (!token) {
    return { valid: false, needRefresh: true };
  }

  const decoded = parseJwt(token);
  if (!decoded) {
    return { valid: false, needRefresh: true };
  }

  if (
    decoded.exp &&
    dayjs().isBefore(dayjs(decoded.exp as number)) &&
    dayjs().diff(dayjs(decoded.exp as number), 'second') <= REFRESH_TOKEN_LEGROOM
  ) {
    return { valid: true, needRefresh: true };
  }
  return { valid: true, needRefresh: false };
}

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URI,
  credentials: 'include',
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.error(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`)
    );
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// const authClient = new ApolloClient({
//   cache: new InMemoryCache(),
//   link: from([errorLink, httpLink]),
// });

// const refreshToken = async (): Promise<string | null> => {
//   const { data } = await authClient.mutate({
//     mutation: REFRESH_TOKEN,
//   });

//   if (!data) {
//     return null;
//   }
//   localStorage.setItem('token', data.refreshToken.accessToken);
//   return data.refreshToken.accessToken;
// };

const authLink = new ApolloLink((operation, forward) => {
  // add the authorization to the headers
  operation.setContext(({ headers = {} }) => {
    console.log('HERE!');
    const token = localStorage.getItem('token');

    if (!token) {
      return { headers };
    }

    // const tokenState = getTokenState(token);
    // console.log(tokenState);
    // if (tokenState.needRefresh && !tokenState.valid) {
    //   console.log('REFRESH');
    //   token = await refreshToken();
    // }

    // console.log('Set auth headers', token);

    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : null,
      },
    };
  });
  return forward(operation);
});

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: from([authLink, errorLink, httpLink]),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'ignore',
    },
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
  },
});

export default client;
