import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import type { Plugin } from "vite";

// hoist-non-react-statics bundles react-is@16 inline which crashes on React 19.
// This plugin replaces it with a no-op at the module resolution level.
function hoistShimPlugin(): Plugin {
  const SHIM_ID = "\0hoist-non-react-statics-shim";
  return {
    name: "hoist-non-react-statics-shim",
    resolveId(id) {
      if (id === "hoist-non-react-statics") return SHIM_ID;
    },
    load(id) {
      if (id === SHIM_ID) {
        return "export default function hoistNonReactStatics(t){return t}";
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");
  return {
    base: env.VITE_BASE_PATH || "/NPRG045/",
    plugins: [
      hoistShimPlugin(),
      react(),
      visualizer({
        filename: "./dist/stats.html",
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    build: {
      chunkSizeWarningLimit: 750,
    },
  };
});
