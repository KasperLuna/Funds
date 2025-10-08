import { useLocalStorage } from "./useLocalStorage";

/**
 * usePrivacy hook
 * Returns { isPrivate, togglePrivacy } using localStorage
 */
export function usePrivacy() {
  const [isPrivate, setIsPrivate] = useLocalStorage<boolean>("isPrivate", true);

  const togglePrivacy = () => setIsPrivate((prev: boolean) => !prev);

  return { isPrivate, togglePrivacy };
}
