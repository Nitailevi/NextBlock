import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nextblock.app",
  appName: "NextBlock",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    iosScheme: "http",
  },
};

export default config;
