import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const ADMIN_APP_NAME = "firebase-frameworks";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

export async function getAuthenticatedAppForUser(
  session: string | null = null
) {
  if (typeof window !== "undefined") {
    return { app: firebaseApp, user: auth.currentUser?.toJSON() };
  }

  const noSessionReturn = { app: null, currentUser: null };

  if (!session) {
    // if no session cookie was passed, try to get from next/headers for app router
    session = (await getAppRouterSession()) ?? "";

    if (!session) return noSessionReturn;
  }
  return { firebaseApp, currentUser: auth.currentUser };
}

async function getAppRouterSession() {
  // dynamically import to prevent import errors in pages router
  const { cookies } = await import("next/headers");

  try {
    return cookies().get("__session")?.value;
  } catch (error) {
    // cookies() throws when called from pages router
    return undefined;
  }
}
