import type { NextConfig } from "next";

// The FastAPI app (backend/app/main.py) registers NO CORSMiddleware, so a
// browser cannot call it cross-origin from http://localhost:3000. Instead of
// touching the backend, every API call goes to the same-origin path /api/*
// and Next proxies it server-side to FastAPI — no preflight, no CORS.
const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN?.replace(/\/$/, "") || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/:path*`,
      },
    ];
  },
};

export default nextConfig;
