import { useSessionStorage } from "./useSessionStorage";

/**
 * usePrivacy hook
 * Returns { isPrivate, togglePrivacy } using sessionStorage.
 * Privacy defaults to true and resets each browser session.
 */
export function usePrivacy() {
  const [isPrivate, setIsPrivate] = useSessionStorage<boolean>(
    "isPrivate",
    true
  );

  const togglePrivacy = () => setIsPrivate((prev: boolean) => !prev);

  return { isPrivate, togglePrivacy };
}
