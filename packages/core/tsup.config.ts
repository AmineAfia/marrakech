import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    analyze: "src/analyze.ts",
    optimize: "src/optimize.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
});
