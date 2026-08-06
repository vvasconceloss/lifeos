import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  outDir: "dist",
  clean: true,
  sourcemap: true,
  target: "es2023",
  skipNodeModulesBundle: true,
  noExternal: [/^@lifeos\//],
});
