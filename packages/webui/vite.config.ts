import react from "@vitejs/plugin-react-swc";
import { mergeConfig, type UserConfigExport } from "vitest/config";
import shared from "../../vitest.shared.js";

const config: UserConfigExport = {
  server:{port:3000,strictPort:true},
  plugins: [...react()],
};

export default mergeConfig(shared, config);
