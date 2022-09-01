import React from "react";
import { AppProps } from "next/app";
import Head from "next/head";
import {
  ColorScheme,
  ColorSchemeProvider,
  MantineProvider,
} from "@mantine/core";
import { NotificationsProvider } from "@mantine/notifications";
import { useLocalStorage } from "@mantine/hooks";
import Layout from "../components/Layout";
import { AuthProvider } from "../components/config/AuthContext";
import ProtectedRoute from "../components/config/ProtectedRoute";
import { useRouter } from "next/router";

const noAuth = ["/"];

export default function App(props: AppProps) {
  const router = useRouter();
  const { Component, pageProps } = props;
  const [colorScheme, setColorScheme] = useLocalStorage<ColorScheme>({
    key: "mantine-color-scheme",
    defaultValue: "dark",
    getInitialValueInEffect: true,
  });
  const toggleColorScheme = (value?: ColorScheme) =>
    setColorScheme(value || (colorScheme === "dark" ? "light" : "dark"));

  return (
    <>
      <Head>
        <title>Page title</title>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="viewport" content="initial-scale=1, viewport-fit=cover" />
        <meta
          name="viewport"
          content="initial-scale=1, viewport-fit=cover, user-scalable=no"
        />
      </Head>
      <ColorSchemeProvider
        colorScheme={colorScheme}
        toggleColorScheme={toggleColorScheme}
      >
        <MantineProvider
          withGlobalStyles
          withNormalizeCSS
          theme={{ colorScheme }}
        >
          <AuthProvider>
            <NotificationsProvider limit={5}>
              <Layout>
                {noAuth.includes(router.pathname) ? (
                  <Component {...pageProps} />
                ) : (
                  <ProtectedRoute>
                    <Component {...pageProps} />
                  </ProtectedRoute>
                )}
              </Layout>
            </NotificationsProvider>
          </AuthProvider>
        </MantineProvider>
      </ColorSchemeProvider>
    </>
  );
}
