import { defineConfig } from "vitest/config";
import path from "path";

// Mirrors tsconfig.json's "@/*" -> "./src/*" path mapping. Needed because
// every prior test file's "@/" imports happened to be `import type` (erased
// at compile time, never actually resolved at runtime) — this is the first
// test whose module graph includes a real runtime "@/" import
// (src/lib/admin/memberData.ts -> @/lib/booking/depositPolicy), which
// exposed that vitest had no alias resolution configured at all.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
