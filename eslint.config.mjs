import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/components/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/db",
                "@/lib/cloudflare-*",
                "@/lib/metadata-backend",
                "@/lib/platform-ops",
                "**/lib/cloudflare-*",
                "**/lib/metadata-backend",
                "**/lib/platform-ops",
                "@/lib/demo-auth",
                "@/lib/auth",
                "@/lib/auth-policy",
                "@/lib/auth-config",
                "@/lib/site-ops",
                "@/lib/storage",
                "@/lib/upload",
                "@/lib/upload-request",
                "**/lib/db",
                "**/lib/demo-auth",
                "**/lib/auth",
                "**/lib/auth-policy",
                "**/lib/auth-config",
                "**/lib/site-ops",
                "**/lib/storage",
                "**/lib/upload",
                "**/lib/upload-request",
                "pg",
                "@aws-sdk/*",
                "node:*",
              ],
              message:
                "Studio UI uses features/studio API contracts; server services stay behind Route Handlers.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "tmp/**", ".playwright-cli/**", "output/**"]),
]);
