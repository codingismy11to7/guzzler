import react from "@vitejs/plugin-react-swc";
import { mergeConfig, type UserConfigExport } from "vitest/config";
import shared from "../../vitest.config.js";
import * as path from "path";
import svgr from "vite-plugin-svgr";

const config: UserConfigExport = {
  server: {
    port: 3000,
    strictPort: true,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 3000
    }
  },
  build: {
    minify: true,
    target: "es2022",
  },
  esbuild: {
    target: "es2022",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
    },
  },
  resolve: {
    alias: {
      "@guzzlerapp/domain": path.resolve(
        // @ts-ignore
        import.meta.dirname,
        "..", "domain", "src", "index.ts",
      ),
      "@guzzlerapp/utils": path.resolve(
        // @ts-ignore
        import.meta.dirname,
        "..", "utils", "src", "index.ts",
      )
    },
  },
  plugins: [...react(), svgr()]
};

export default mergeConfig(shared, config);
