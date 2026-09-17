export const APP_BUILD_ID = __APP_BUILD_ID__ || "dev";

export const DOCS_URL = import.meta.env.VITE_DOC_URL || "https://github.com/Arm0ne/AI-image/tree/custom/docs";

// Official plugin registry URL: CI publishes to plugins-dist for jsDelivr delivery; an environment variable may override it for self-hosting.
export const PLUGIN_REGISTRY_URL = import.meta.env.VITE_PLUGIN_REGISTRY_URL || "https://cdn.jsdelivr.net/gh/Arm0ne/AI-image@plugins-dist/official-plugins.json";
