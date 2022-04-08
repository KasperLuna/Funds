import React from "react";
import {
  Paper,
  createStyles,
  TextInput,
  PasswordInput,
  Checkbox,
  Button,
  Title,
  Text,
  Anchor,
  Box,
  Progress,
  Group,
  Center,
} from "@mantine/core";
import { ChevronLeft } from "tabler-icons-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useInputState } from "@mantine/hooks";
import { Check, X } from "tabler-icons-react";

const useStyles = createStyles((theme) => ({
  wrapper: {
    minHeight: 900,
    backgroundSize: "cover",
    backgroundImage:
      "url(https://res.cloudinary.com/dy9kcczqb/image/upload/c_fill,f_webp,h_1007,w_1280/v1649429999/P1040311_bdvkrx.webp)",
  },

  form: {
    borderLeft: `1px solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.colors.gray[3]
    }`,
    borderRight: `1px solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.colors.gray[3]
    }`,
    margin: "auto",
    minHeight: 900,
    maxWidth: 600,
    paddingTop: 80,

    [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
      maxWidth: "100%",
    },
  },

  title: {
    color: theme.colorScheme === "dark" ? theme.white : theme.black,
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
  },

  logo: {
    color: theme.colorScheme === "dark" ? theme.white : theme.black,
    width: 120,
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
  },
}));

const Login = () => {
  const { classes } = useStyles();
  return (
    <>
      <Title order={2} className={classes.title} align="center" mt="xl" mb={50}>
        Log into Financhee
      </Title>

      <TextInput
        label="Email address"
        placeholder="hello@gmail.com"
        type="email"
        size="md"
      />
      <PasswordInput
        label="Password"
        placeholder="Your password"
        mt="md"
        size="md"
      />
      <Checkbox label="Keep me logged in" mt="xl" size="md" />
      <Button fullWidth mt="xl" size="md">
        Login
      </Button>

      <Text align="center" mt="md">
        Don&apos;t have an account?{" "}
        <Link href={{ pathname: "/account", query: { signup: "" } }} passHref>
          <Anchor weight={700}>Sign Up</Anchor>
        </Link>
      </Text>
    </>
  );
};

function PasswordRequirement({
  meets,
  label,
}: {
  meets: boolean;
  label: string;
}) {
  return (
    <Text color={meets ? "teal" : "red"} mt={5} size="sm">
      <Center inline>
        {meets ? <Check size={14} /> : <X size={14} />}
        <Box ml={7}>{label}</Box>
      </Center>
    </Text>
  );
}

const requirements = [
  { re: /[0-9]/, label: "Includes number" },
  { re: /[a-z]/, label: "Includes lowercase letter" },
  { re: /[A-Z]/, label: "Includes uppercase letter" },
  { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: "Includes special symbol" },
];

function getStrength(password: string) {
  let multiplier = password.length > 5 ? 0 : 1;

  requirements.forEach((requirement) => {
    if (!requirement.re.test(password)) {
      multiplier += 1;
    }
  });

  return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 0);
}

export function PasswordStrength() {
  const [value, setValue] = useInputState("");
  const [repeatValue, setRepeatValue] = useInputState("");
  const strength = getStrength(value);
  const checks = requirements.map((requirement, index) => (
    <PasswordRequirement
      key={index}
      label={requirement.label}
      meets={requirement.re.test(value)}
    />
  ));

  let progress: number;
  const bars = Array(4)
    .fill(0)
    .map((_, index) => (
      <Progress
        styles={{ bar: { transitionDuration: "0ms" } }}
        value={
          value.length > 0 && index === 0
            ? 100
            : strength >= ((index + 1) / 4) * 100
            ? 100
            : 0
        }
        color={strength > 80 ? "teal" : strength > 50 ? "yellow" : "red"}
        key={index}
        size={4}
      />
    ));

  const VerifyBar = () => {
    return (
      <Progress
        styles={{ bar: { transitionDuration: "0ms" } }}
        value={value == repeatValue && Boolean(value) ? 100 : 0}
        color={value == repeatValue ? "teal" : "red"}
        size={4}
      />
    );
  };

  return (
    <div>
      <PasswordInput
        value={value}
        onChange={setValue}
        placeholder="Your password"
        label="Password"
        mt="md"
        size="md"
        required
      />

      <Group spacing={5} grow mt="xs" mb="md">
        {bars}
      </Group>

      <PasswordRequirement
        label="Has at least 6 characters"
        meets={value.length > 5}
      />

      {checks}
      <PasswordInput
        value={repeatValue}
        onChange={setRepeatValue}
        placeholder="Your password again"
        label="Verify Password"
        mt="md"
        size="md"
        required
      />
      <Box mt="xs" mb="sm">
        <VerifyBar />
      </Box>

      <PasswordRequirement
        label="Password Verification Matches"
        meets={value == repeatValue && Boolean(value)}
      />
    </div>
  );
}

const Signup = () => {
  const { classes } = useStyles();
  return (
    <>
      <Title order={2} className={classes.title} align="center" mt="xl" mb={50}>
        Sign up for Financhee
      </Title>

      <TextInput
        label="Email address"
        placeholder="hello@gmail.com"
        type="email"
        size="md"
        required
      />
      <PasswordStrength />
      <Button fullWidth mt="xl" size="md">
        Sign Up
      </Button>

      <Text align="center" mt="md">
        Already have an account?{" "}
        <Link href={{ pathname: "/account", query: { login: "" } }} passHref>
          <Anchor weight={700}>Log In</Anchor>
        </Link>
      </Text>
    </>
  );
};

export default function AuthenticationImage() {
  const { classes } = useStyles();
  const router = useRouter();
  const { signup, login } = router.query;

  return (
    <div className={classes.wrapper}>
      <Paper className={classes.form} radius={0} p={30}>
        <Link href="/" passHref>
          <Anchor size={"sm"} variant="link">
            <ChevronLeft size={10} />
            Return to Homepage
          </Anchor>
        </Link>

        {login != undefined ? (
          <Login />
        ) : signup != undefined ? (
          <Signup />
        ) : (
          <Login />
        )}
      </Paper>
    </div>
  );
}
