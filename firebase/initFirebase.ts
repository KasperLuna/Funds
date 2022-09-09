import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  CACHE_SIZE_UNLIMITED,
  enableIndexedDbPersistence,
  initializeFirestore,
} from "firebase/firestore";
import { showErrorNotif } from "../utils/notifs";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
export const firebase = initializeApp(firebaseConfig);

export const db = initializeFirestore(firebase, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == "failed-precondition") {
    showErrorNotif(
      "Offline persistence can only be enabled in one tab at a time. Close other tabs."
    );
  } else if (err.code == "unimplemented") {
    showErrorNotif("Current browser does not support offline persistence");
  }
});

export const auth = getAuth(firebase);
