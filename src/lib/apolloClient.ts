import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

const httpLink = createHttpLink({
  uri: "https://db.vocallabs.ai/v1/graphql",
});

const authLink = setContext((_, { headers }) => {
  const token =
    localStorage.getItem("auth_token") || localStorage.getItem("access_token");

  return {
    headers: {
      ...headers,
      "content-type": "application/json",
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
