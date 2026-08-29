import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const webDir = dirname(fileURLToPath(import.meta.url));
const localVersion = readFileSync(resolve(webDir, "../VERSION"), "utf8").trim() || "dev";
const buildId = process.env.VITE_BUILD_ID?.trim() || new Date().toISOString();

// Expose /plugins/index.json with local plugin files from public/plugins.
// The frontend can discover and list them when enabled; development reads the directory live, while builds emit a static registry.
function localPluginsManifest(): Plugin {
    const pluginsDir = resolve(webDir, "public/plugins");
    const listLocalPlugins = () => {
        try {
            return readdirSync(pluginsDir)
                .filter((file) => file.endsWith(".js"))
                .sort()
                .map((file) => `/plugins/${file}`);
        } catch {
            return [];
        }
    };
    return {
        name: "local-plugins-manifest",
        configureServer(server) {
            server.middlewares.use("/plugins/index.json", (_req, res) => {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(listLocalPlugins()));
            });
        },
        generateBundle() {
            this.emitFile({ type: "asset", fileName: "plugins/index.json", source: JSON.stringify(listLocalPlugins()) });
        },
    };
}

export default defineConfig({
    base: process.env.VITE_BASE || "/",
    plugins: [react(), localPluginsManifest()],
    resolve: {
        alias: {
            "@": resolve(webDir, "src"),
        },
    },
    define: {
        __APP_VERSION__: JSON.stringify(localVersion),
        __APP_BUILD_ID__: JSON.stringify(buildId),
    },
    build: {
        rollupOptions: {
            plugins: [
                {
                    name: "generate-version-json",
                    generateBundle() {
                        // 在构建时生成 version.json 文件
                        this.emitFile({
                            type: "asset",
                            fileName: "version.json",
                            // Keep the legacy field unique so pages running the previous checker detect this migration build.
                            source: JSON.stringify({ version: `${localVersion}+${buildId}`, appVersion: localVersion, buildId }),
                        });
                    },
                },
            ],
        },
    },
    server: {
        proxy: {
            "/panlai-api": {
                target: "https://api.panlai.me",
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/panlai-api/, ""),
            },
        },
    },
});
