const backend = (process.env.PYLAB_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "https://pylab-production-d52a.up.railway.app").replace(/\/$/, "");

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${backend}/:path*`,
      },
    ];
  },
};

export default nextConfig;
