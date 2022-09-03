import React, { useState } from "react";
import { upperFirst } from "@mantine/hooks";
import {
  TextInput,
  PasswordInput,
  Group,
  Button,
  Divider,
  Checkbox,
  Anchor,
  Stack,
  Drawer,
  createStyles,
} from "@mantine/core";
import { useForm } from "react-hook-form";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInAnonymously,
} from "firebase/auth";
import router from "next/router";
import { IconAt, IconBrandGoogle, IconLock, IconUser } from "@tabler/icons";
import { useAuth } from "../config/AuthContext";
import Link from "next/link";

type AuthFormProps = {
  email?: string;
  password?: string;
  repeatPassword?: string;
  terms?: boolean;
};

const useStyles = createStyles((theme) => ({
  drawer: {
    overflowY: "auto",
    "@media screen and (display-mode: standalone) and (orientation: portrait)":
      {
        paddingTop: theme.spacing.lg * 4,
      },
  },
}));

export function AuthForm({ inHeader }: { inHeader?: boolean }) {
  const { classes } = useStyles();
  const auth = getAuth();
  const { user } = useAuth();
  const [type, setType] = useState<"login" | "sign up">("login");
  const [opened, setOpened] = useState<boolean>(false);
  const googleProvider = new GoogleAuthProvider();
  googleProvider.addScope("profile");
  googleProvider.addScope("email");

  const callGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/home");
    } catch (error) {
      console.log(error);
    }
  };

  const callAnonymousSignIn = async () => {
    try {
      await signInAnonymously(auth);
      router.push("/home");
    } catch (error) {
      console.log(error);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormProps>({
    defaultValues: {
      email: "",
      password: "",
      repeatPassword: "",
      terms: false,
    },
  });
  const onSubmit = async (data: AuthFormProps) => {
    try {
      if (data.email && data.password) {
        if (type === "login") {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            data.email,
            data.password
          );
          console.log(userCredential);
          router.push("/home");
        } else {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            data.email,
            data.password
          );
          console.log(userCredential);
          router.push("/home");
        }
      }
    } catch (error) {
      console.log(error);
      // const errorMessage = error.message
      //   .replace("Firebase: ", "")
      //   .replace("auth/", "");
      // showErrorNotif(errorMessage);
    }
  };

  return (
    <>
      {user ? (
        <>
          <Link href="/home" passHref>
            <Button radius={"lg"} component="a">
              Return to Dashboard
            </Button>
          </Link>
        </>
      ) : (
        <Group spacing={7}>
          {!inHeader && (
            <Button
              radius="lg"
              variant="outline"
              onClick={() => {
                setType("sign up");
                setOpened(true);
              }}
            >
              Sign Up
            </Button>
          )}
          <Button
            radius="lg"
            onClick={() => {
              setType("login");
              setOpened(true);
            }}
            size={inHeader ? "xs" : "sm"}
          >
            Log In
          </Button>
        </Group>
      )}

      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        title={` Welcome to Funds, ${type} with`}
        padding="xl"
        size="xl"
        position="right"
        className={classes.drawer}
      >
        <Group grow mb="md" mt="md">
          <Button
            onClick={() => callGoogleSignIn()}
            leftIcon={<IconBrandGoogle />}
            color="gray"
            radius={"lg"}
          >
            Google
          </Button>
          <Button
            onClick={() => callAnonymousSignIn()}
            leftIcon={<IconUser />}
            color="gray"
            radius={"lg"}
          >
            As Guest
          </Button>
        </Group>
        <Divider
          label="Or continue with email"
          labelPosition="center"
          my="lg"
        />
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack>
            <TextInput
              required
              label="Email"
              placeholder="hello@mantine.dev"
              icon={<IconAt size={15} />}
              {...register("email", {
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "invalid email address",
                },
              })}
              error={errors.email && errors.email.message}
            />
            {type === "sign up" ? (
              <>
                <PasswordInput
                  required
                  label="Password"
                  placeholder="Your password"
                  icon={<IconLock size={15} />}
                  {...register("password", {
                    required: "required",
                    minLength: {
                      value: 8,
                      message: "must be 8 chars",
                    },
                  })}
                  error={errors.password && errors.password.message}
                />

                <PasswordInput
                  required
                  label="Repeat Password"
                  placeholder="Your password again"
                  icon={<IconLock size={15} />}
                  {...register("repeatPassword", {
                    required: "required",
                    minLength: {
                      value: 8,
                      message: "must be 8 chars",
                    },
                  })}
                  error={errors.password && errors.password.message}
                />

                <Checkbox
                  required
                  label="I accept terms and conditions"
                  {...register("terms")}
                />
              </>
            ) : (
              <>
                <PasswordInput
                  required
                  label="Password"
                  placeholder="Your password"
                  icon={<IconLock size={15} />}
                  {...register("password", {
                    required: "required",
                    minLength: {
                      value: 8,
                      message: "must be 8 chars",
                    },
                  })}
                  error={errors.password && errors.password.message}
                />
              </>
            )}
          </Stack>

          <Group position="apart" mt="xl">
            <Anchor
              component="button"
              type="button"
              color="dimmed"
              onClick={() =>
                setType((prevType) =>
                  prevType === "login" ? "sign up" : "login"
                )
              }
              size="xs"
            >
              {type === "sign up"
                ? "Already have an account? Login"
                : "Don't have an account? Sign up"}
            </Anchor>
            <Button type="submit">{upperFirst(type)}</Button>
          </Group>
        </form>
      </Drawer>
    </>
  );
}
