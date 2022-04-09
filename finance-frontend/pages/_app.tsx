import { AppProps } from "next/app";
import Head from "next/head";
import { ColorSchemeProvider, MantineProvider } from "@mantine/core";
import useColorScheme from "../utils/useColorScheme";
import { UserProvider } from "@auth0/nextjs-auth0";

export default function App(props: AppProps) {
  const { Component, pageProps } = props;
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <>
      <Head>
        <title>Page title</title>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width"
        />
      </Head>
      <UserProvider>
        <ColorSchemeProvider
          colorScheme={colorScheme}
          toggleColorScheme={toggleColorScheme}
        >
          <MantineProvider
            withGlobalStyles
            withNormalizeCSS
            theme={{ colorScheme }}
          >
            <Component {...pageProps} />
          </MantineProvider>
        </ColorSchemeProvider>
      </UserProvider>
    </>
  );
}
