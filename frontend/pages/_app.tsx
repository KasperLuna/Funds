import { AppProps } from 'next/app';
import Head from 'next/head';
import { MantineProvider } from '@mantine/core';
import { NotificationsProvider } from '@mantine/notifications';

export default function App(props: AppProps) {
  const { Component, pageProps } = props;

  return (
    <>
      <Head>
        <title>Page title</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
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

      <MantineProvider
        withGlobalStyles
        withNormalizeCSS
        theme={{
          /** Put your mantine theme override here */
          colorScheme: 'dark',
        }}
      >
        <NotificationsProvider limit={5}>
          <Component {...pageProps} />
        </NotificationsProvider>
      </MantineProvider>
    </>
  );
}