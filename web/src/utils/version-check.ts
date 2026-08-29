import { APP_BUILD_ID } from "@/constant/env";

const CHECK_INTERVAL = 5 * 60 * 1000;
const INITIAL_CHECK_DELAY = 5000;

type VersionManifest = {
    buildId?: unknown;
};

export function forceReload(): void {
    window.location.reload();
}

export function startVersionCheck(onUpdateDetected: () => void): () => void {
    let checking = false;
    let stopped = false;
    let detectedBuildId = "";

    const check = async () => {
        if (checking || stopped) return;
        checking = true;

        try {
            const response = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
            if (!response.ok) return;

            const data = (await response.json()) as VersionManifest;
            const serverBuildId = typeof data.buildId === "string" ? data.buildId.trim() : "";
            if (serverBuildId && serverBuildId !== APP_BUILD_ID && serverBuildId !== detectedBuildId) {
                detectedBuildId = serverBuildId;
                onUpdateDetected();
            }
        } catch (error) {
            console.warn("版本检查失败:", error);
        } finally {
            checking = false;
        }
    };

    const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") void check();
    };

    const timeoutId = window.setTimeout(() => void check(), INITIAL_CHECK_DELAY);
    const intervalId = window.setInterval(() => void check(), CHECK_INTERVAL);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
        stopped = true;
        window.clearTimeout(timeoutId);
        window.clearInterval(intervalId);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
}
