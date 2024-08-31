import { pb } from "./pocketbase/pocketbase";
import { removeCookie } from "./utils";

export const signInWithGoogle = async () => {
  try {
    const user = await pb
      .collection("users")
      .authWithOAuth2({ provider: "google" });
    return user;
  } catch (error) {
    console.error(error);
  }
};

export const signUp = async (email: string, password: string) => {
  try {
    const user = await pb.collection("users").create({
      email,
      password,
      passwordConfirm: password,
    });
    return user;
  } catch (error) {
    console.error(error);
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const authData = await pb
      .collection("users")
      .authWithPassword(email, password);
    return authData;
  } catch (error) {
    console.error(error);
  }
};

export const signOut = () => {
  pb.realtime.unsubscribe();
  pb.authStore.clear();
  removeCookie("pb_auth");
  //   setUser(null);
};
