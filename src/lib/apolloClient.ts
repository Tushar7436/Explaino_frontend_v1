import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

// Replace with your actual GraphQL endpoint
const httpLink = createHttpLink({
    uri: 'https://db.vocallabs.ai/v1/graphql',
});

export const apolloClient = new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
});
