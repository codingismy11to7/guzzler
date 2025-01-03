import react from "@vitejs/plugin-react-swc";
import { mergeConfig, type UserConfigExport } from "vitest/config";
import shared from "../../vitest.shared.js";

const config: UserConfigExport = {
  plugins: [...react()],
};

export default mergeConfig(shared, config);
