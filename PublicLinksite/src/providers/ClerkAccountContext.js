import { createContext, useContext } from 'react';

export const FiipClerkContext = createContext({
  loaded: true,
  signedIn: false,
  user: null,
  signOut: async () => {},
});

export function useFiipClerk() {
  return useContext(FiipClerkContext);
}
