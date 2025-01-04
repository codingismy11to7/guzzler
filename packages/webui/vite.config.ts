import react from "@vitejs/plugin-react-swc";
import { mergeConfig, type UserConfigExport } from "vitest/config";
import shared from "../../vitest.shared.js";
import * as path from "path";

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
  resolve: {
    alias: {
      "@guzzler/domain": path.resolve(
        // @ts-ignore
        import.meta.dirname,
        "../domain/src/index.ts"
      )
    }
  },
  plugins: [...react()]
};

export default mergeConfig(shared, config);
