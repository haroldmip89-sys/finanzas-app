import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    // Many files boot an in-memory Postgres (PGlite) in parallel; give hooks room.
    hookTimeout: 30_000,
    setupFiles: ["./vitest.setup.ts"],
  },
});
