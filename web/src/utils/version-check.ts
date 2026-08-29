/**
 * 版本检测工具
 * 用于检测应用版本更新并提示用户刷新
 */

const VERSION_KEY = "infinite-canvas:app_version";
const CHECK_INTERVAL = 30 * 60 * 1000; // 30分钟检查一次

/**
 * 获取当前应用版本号（从构建时注入）
 */
export function getCurrentVersion(): string {
    return __APP_VERSION__;
}

/**
 * 获取本地存储的版本号
 */
export function getStoredVersion(): string | null {
    return localStorage.getItem(VERSION_KEY);
}

/**
 * 保存版本号到本地存储
 */
export function saveVersion(version: string): void {
    localStorage.setItem(VERSION_KEY, version);
}

/**
 * 检查版本是否需要更新
 * 如果检测到版本不一致，返回 true
 */
export function checkVersionUpdate(): boolean {
    const currentVersion = getCurrentVersion();
    const storedVersion = getStoredVersion();

    // 第一次访问，保存当前版本
    if (!storedVersion) {
        saveVersion(currentVersion);
        return false;
    }

    // 版本不一致，需要更新
    if (storedVersion !== currentVersion) {
        console.log(`检测到版本更新: ${storedVersion} -> ${currentVersion}`);
        return true;
    }

    return false;
}

/**
 * 强制刷新页面并清除缓存
 */
export function forceReload(): void {
    const currentVersion = getCurrentVersion();
    saveVersion(currentVersion);

    // 清除所有缓存
    if ('caches' in window) {
        caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
        });
    }

    // 强制刷新页面（绕过缓存）
    window.location.reload();
}

/**
 * 启动定期版本检查
 * 通过请求一个版本文件来检测服务器版本
 */
export function startVersionCheck(onUpdateDetected: () => void): () => void {
    let intervalId: number | null = null;

    const check = async () => {
        try {
            // 请求版本文件，添加时间戳避免缓存
            const response = await fetch(`/version.json?t=${Date.now()}`, {
                cache: 'no-cache',
            });

            if (response.ok) {
                const data = await response.json();
                const serverVersion = data.version;
                const currentVersion = getCurrentVersion();

                if (serverVersion && serverVersion !== currentVersion) {
                    console.log(`检测到服务器版本更新: ${currentVersion} -> ${serverVersion}`);
                    onUpdateDetected();
                }
            }
        } catch (error) {
            // 静默失败，不影响用户体验
            console.warn("版本检查失败:", error);
        }
    };

    // 延迟5秒后首次检查（避免影响首屏加载和测试）
    setTimeout(check, 5000);

    // 定期检查
    intervalId = window.setInterval(check, CHECK_INTERVAL);

    // 返回清理函数
    return () => {
        if (intervalId !== null) {
            clearInterval(intervalId);
        }
    };
}
