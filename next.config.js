// /** @type {import('next').NextConfig} */
// const nextConfig = {};

// export default nextConfig;

// Importing the PWA configuration function
import withPWA from "@ducanh2912/next-pwa";

// Configuring the PWA options
const pwaConfig = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: false,
  workboxOptions: {
    disableDevLogs: true,
  },
});

// Exporting the configured PWA settings
export default pwaConfig;
