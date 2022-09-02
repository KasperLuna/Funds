import React from "react";
import { useToggle, upperFirst } from "@mantine/hooks";
import {
  TextInput,
  PasswordInput,
  Text,
  Paper,
  Group,
  PaperProps,
  Button,
  Divider,
  Checkbox,
  Anchor,
  Stack,
  Overlay,
  Box,
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
import { IconBrandGoogle, IconUser } from "@tabler/icons";
import { useAuth } from "../config/AuthContext";

type AuthFormProps = {
  email?: string;
  password?: string;
  repeatPassword?: string;
  terms?: boolean;
};

export function AuthForm(props: PaperProps) {
  const auth = getAuth();
  const { user } = useAuth();
  const [type, toggle] = useToggle(["login", "register"]);
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
    <Box sx={{ height: "100%", position: "relative" }}>
      <Paper radius="md" p="xl" withBorder {...props}>
        {user && <Overlay opacity={0.1} color="#000" blur={2} />}
        <Text size="lg" weight={500}>
          Welcome to Funds, {type} with
        </Text>
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
              {...register("email", {
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "invalid email address",
                },
              })}
              error={errors.email && errors.email.message}
            />
            {type === "register" ? (
              <>
                <PasswordInput
                  required
                  label="Password"
                  placeholder="Your password"
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
                  placeholder="Your password"
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
              onClick={() => toggle()}
              size="xs"
            >
              {type === "register"
                ? "Already have an account? Login"
                : "Don't have an account? Register"}
            </Anchor>
            <Button type="submit">{upperFirst(type)}</Button>
          </Group>
        </form>
      </Paper>
    </Box>
  );
}
