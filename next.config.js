/** @type {import("next").NextConfig} */
const nextConfig = {
  // Next 14 can generate an incomplete app-path manifest when it builds pages
  // concurrently under newer Node runtimes. Keep this legacy project on one
  // worker until it is upgraded to a supported Next release.
  experimental: {
    cpus: 1,
  },
};

module.exports = nextConfig;
