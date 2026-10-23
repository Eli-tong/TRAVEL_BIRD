import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // Archived source snapshots in output/ are not executable test suites.
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    globals: true
  }
});
