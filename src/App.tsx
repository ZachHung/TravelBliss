import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

import { ApolloClient, ApolloProvider, createHttpLink, from, InMemoryCache } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { MantineProvider } from '@mantine/core';
import { Router } from './routes/Router';
import { theme } from './theme';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URI,
  credentials: 'include',
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`)
    );
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: from([errorLink, httpLink]),
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

export default function App() {
  return (
    <ApolloProvider client={client}>
      <MantineProvider theme={theme}>
        <Router />
      </MantineProvider>
    </ApolloProvider>
  );
}
