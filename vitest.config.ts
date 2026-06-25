import { defineConfig } from "vitest/config";
import path from "path";

// Config dedicada de testes (Vitest). Mantém o alias "@" do app e roda em ambiente node,
// sem carregar os plugins de build (SWC/lovable-tagger). Ver rules/common/testing.md.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
