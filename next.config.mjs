// import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Enable React strict mode for improved error handling
  // swcMinify: true, // Enable SWC minification for improved performance
  compiler: {
    removeConsole: process.env.NODE_ENV !== "development", // Remove console.log in production
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "coin-images.coingecko.com",
        port: "",
        pathname: "/coins/images/**",
      },
    ],
  },
};

// export default withPWA({
//   dest: "public", // destination directory for the PWA files
//   disable: process.env.NODE_ENV === "development", // disable PWA in the development environment
//   register: true, // register the PWA service worker
//   skipWaiting: true, // skip waiting for service worker activation
//   runtimeCaching: [
//     {
//       // Cache everything except requests to pb.kasperluna.com
//       urlPattern: ({ url }) => {
//         return !url.hostname.includes("pb.kasperluna.com");
//       },
//       handler: "CacheFirst",
//       options: {
//         cacheName: "default-cache",
//         expiration: {
//           maxEntries: 200,
//           maxAgeSeconds: 30 * 24 * 60 * 60, // Cache for 30 days
//         },
//         cacheableResponse: {
//           statuses: [0, 200],
//         },
//       },
//     },
//     {
//       // Bypass cache for pb.kasperluna.com
//       urlPattern: ({ url }) => url.hostname.includes("pb.kasperluna.com"),
//       handler: "NetworkOnly",
//     },
//   ],
// })(nextConfig);

export default nextConfig;
