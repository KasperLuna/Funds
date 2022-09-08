/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import {
  Text,
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
  Popover,
  Modal,
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
  sendEmailVerification,
  signOut,
  sendPasswordResetEmail,
  User,
} from "firebase/auth";
import router from "next/router";
import { IconAt, IconBrandGoogle, IconLock, IconUser } from "@tabler/icons";
import { useAuth } from "../config/AuthContext";
import Link from "next/link";
import PasswordComponent from "./PasswordComponent";
import {
  AuthErrorNotifHandler,
  showErrorNotif,
  showSuccessNotif,
} from "../../utils/notifs";

export type AuthFormProps = {
  email?: string;
  password?: string;
  terms?: boolean;
};

const useStyles = createStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  drawer: {
    overflowY: "auto",
    "@media screen and (display-mode: standalone) and (orientation: portrait)":
      {
        paddingTop: theme.spacing.lg * 4,
      },
  },
  title: {
    fontFamily: "Arial Black, Arial Bold, Gadget, sans-serif",
    letterSpacing: -1.5,
    textAlign: "center",
    fontSize: "25px",
    fontWeight: 1000,
  },
  mainButtons: {
    width: 250,
    height: 50,
    [`@media (max-width: ${theme.breakpoints.md}px)`]: {
      width: 150,
    },
  },

  retToDashButton: {
    width: 250,
    height: 50,

    [`@media (max-width: ${theme.breakpoints.md}px)`]: {
      width: 220,
    },
  },
}));

export function AuthForm({ inHeader }: { inHeader?: boolean }) {
  const { classes } = useStyles();
  const auth = getAuth();
  const { user } = useAuth();
  const [type, setType] = useState<"Log in" | "Sign up">("Log in");
  const [opened, setOpened] = useState<boolean>(false);
  const [strength, setStrength] = useState<number>(0);
  const [passwordError, setPasswordError] = useState<boolean>(false);
  const [passwordResetEmail, setPasswordResetEmail] = useState<string>("");
  const [verifyUserModal, setVerifyUserModal] = useState<boolean>(false);
  const [unverifiedUser, setUnverifiedUser] = useState<User | null>(null);
  const googleProvider = new GoogleAuthProvider();
  googleProvider.addScope("profile");
  googleProvider.addScope("email");

  const callGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/home");
    } catch (error) {
      showErrorNotif("Google sign in failed");
      console.log(error);
    }
  };

  const callAnonymousSignIn = async () => {
    try {
      await signInAnonymously(auth);
      router.push("/home");
    } catch (error) {
      showErrorNotif("Anonymous sign in failed");
      console.log(error);
    }
  };

  const {
    register,
    watch,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AuthFormProps>({
    defaultValues: {
      email: "",
      password: "",
      terms: false,
    },
  });

  const toggleType = () => {
    setValue("password", "");
    setType(type === "Log in" ? "Sign up" : "Log in");
  };

  const password = watch("password");
  const isSecure = strength === 100;

  useEffect(() => {
    setPasswordError(false);
  }, [strength]);

  const onSubmit = async (data: AuthFormProps) => {
    try {
      if (data.email && data.password) {
        if (type === "Log in") {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            data.email,
            data.password
          );
          if (userCredential.user.emailVerified) {
            router.push("/home");
          } else {
            setUnverifiedUser(userCredential.user);
            await signOut(auth);
            setVerifyUserModal(true);
            throw new Error("(email-not-verified)");
          }
        } else {
          if (!isSecure) {
            setPasswordError(true);
            return;
          }
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            data.email,
            data.password
          );
          await sendEmailVerification(userCredential.user);
          showSuccessNotif(
            "Account created! check your email for verification."
          );
          setType("Log in");
        }
      }
    } catch (error: string | any) {
      AuthErrorNotifHandler(error.message);
    }
  };

  const onPasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, passwordResetEmail);
      setPasswordResetEmail("");
      showSuccessNotif("Password reset email sent! Check your inbox.");
    } catch (error: string | any) {
      AuthErrorNotifHandler(error.message);
    }
  };

  const handlePassResetKeypress = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key) {
      if (event.key == "Enter" && !event.shiftKey) {
        event.preventDefault();
        onPasswordReset();
      }
    }
  };

  return (
    <>
      <Box className={classes.root}>
        {user ? (
          <>
            <Link href="/home" passHref>
              <Button
                variant="filled"
                color="orange"
                className={classes.retToDashButton}
                radius={"xl"}
                component="a"
              >
                Return to Dashboard
              </Button>
            </Link>
          </>
        ) : (
          <Group spacing={7}>
            {!inHeader && (
              <Button
                radius="xl"
                className={classes.mainButtons}
                variant="outline"
                color={"yellow"}
                onClick={() => {
                  setType("Sign up");
                  setOpened(true);
                }}
              >
                Sign Up
              </Button>
            )}
            <Button
              radius="xl"
              color={"orange"}
              className={classes.mainButtons}
              onClick={() => {
                setType("Log in");
                setOpened(true);
              }}
            >
              Log In
            </Button>
          </Group>
        )}
        <Drawer
          opened={opened}
          onClose={() => setOpened(false)}
          title={`${type} with`}
          padding="xl"
          size="xl"
          position="right"
          classNames={{ drawer: classes.drawer, title: classes.title }}
        >
          <Group grow mb="md" mt="md">
            <Button
              onClick={() => callGoogleSignIn()}
              leftIcon={<IconBrandGoogle />}
              color="blue"
              radius={"lg"}
            >
              Google
            </Button>
            <Button
              onClick={() => callAnonymousSignIn()}
              leftIcon={<IconUser />}
              color="blue"
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
          <form onSubmit={handleSubmit(onSubmit)} autoComplete="on">
            <Stack>
              <TextInput
                required
                label="Email: "
                placeholder="dev@kasperluna.com"
                autoComplete="username"
                icon={<IconAt size={15} />}
                {...register("email", {
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "invalid email address",
                  },
                })}
                error={errors.email && errors.email.message}
              />
              {type === "Sign up" ? (
                <>
                  <PasswordComponent
                    register={register}
                    value={password || ""}
                    setStrength={setStrength}
                    passwordError={passwordError}
                  />
                  <Checkbox
                    required
                    label={
                      <>
                        I agree to the{" "}
                        <a
                          href={"/agreement"}
                          target="_blank"
                          style={{ color: "teal" }}
                          rel="noreferrer"
                        >
                          {"Terms and Conditions"}
                        </a>
                      </>
                    }
                    {...register("terms")}
                  />
                </>
              ) : (
                <PasswordInput
                  required
                  label="Password: "
                  placeholder="Password"
                  autoComplete="current-password"
                  icon={<IconLock size={15} />}
                  {...register("password")}
                  error={errors.password && errors.password.message}
                />
              )}
            </Stack>
            <Stack>
              <Group position="apart" mt="xl">
                <Anchor
                  component="button"
                  type="button"
                  color="dimmed"
                  onClick={toggleType}
                  size="xs"
                >
                  {type === "Sign up"
                    ? "Already have an account? Log in"
                    : "Don't have an account? Sign up"}
                </Anchor>
                {type === "Log in" && (
                  <Popover
                    trapFocus
                    position="top-end"
                    withArrow
                    width={300}
                    withinPortal={true}
                  >
                    <Popover.Target>
                      <Anchor
                        component="button"
                        type="button"
                        color="dimmed"
                        onClick={toggleType}
                        size="xs"
                      >
                        Forgot Password?
                      </Anchor>
                    </Popover.Target>
                    <Popover.Dropdown>
                      <Stack>
                        <TextInput
                          label="Email"
                          placeholder="dev@kasperluna.com"
                          onChange={(e) => {
                            setPasswordResetEmail(e.target.value);
                          }}
                          onKeyDown={handlePassResetKeypress}
                          size="xs"
                          icon={<IconAt size={15} />}
                        />
                        <Button
                          color="orange"
                          variant="outline"
                          onClick={onPasswordReset}
                        >
                          Send Password Reset Email
                        </Button>
                      </Stack>
                    </Popover.Dropdown>
                  </Popover>
                )}
              </Group>
              <Button radius={"xl"} color="orange" type="submit">
                {type}
              </Button>
            </Stack>
          </form>
        </Drawer>

        <UnverifiedUserModal
          opened={verifyUserModal}
          setOpened={setVerifyUserModal}
          user={unverifiedUser}
        />
      </Box>
    </>
  );
}

const UnverifiedUserModal = ({
  opened,
  setOpened,
  user,
}: {
  opened: boolean;
  setOpened: React.Dispatch<React.SetStateAction<boolean>>;
  user?: User | null;
}) => {
  const resendVerificationEmail = async () => {
    if (user) {
      try {
        await sendEmailVerification(user);
        showSuccessNotif("Verification email sent! Check your inbox.");
        setOpened(false);
      } catch (error: string | any) {
        AuthErrorNotifHandler(error.message);
      }
    }
  };

  return (
    <>
      <Modal
        centered
        opened={opened}
        onClose={() => setOpened(false)}
        title="User not verified."
      >
        <Stack>
          <Text>
            {`You haven't verified your email address. Please check your inbox
          for the verification email. If you wish to resend the verification
          email, click the button below.`}
          </Text>
          <Button color={"orange"} onClick={resendVerificationEmail}>
            Resend Verification Email
          </Button>
        </Stack>
      </Modal>
    </>
  );
};
