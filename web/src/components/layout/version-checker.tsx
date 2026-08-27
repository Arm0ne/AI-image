import { useEffect } from "react";
import { Modal } from "antd";
import { checkVersionUpdate, forceReload, startVersionCheck } from "@/utils/version-check";

/**
 * 版本检测组件
 * 在应用启动时检测版本，发现更新时提示用户刷新
 */
export function VersionChecker() {
    useEffect(() => {
        // 1. 启动时检查本地存储的版本
        if (checkVersionUpdate()) {
            // 检测到版本更新，直接强制刷新（静默）
            forceReload();
            return;
        }

        // 2. 启动定期检查（检查服务器版本文件）
        const cleanup = startVersionCheck(() => {
            // 检测到服务器版本更新，弹窗提示用户
            Modal.info({
                title: "发现新版本",
                content: "检测到应用有新版本，点击确定刷新页面以使用最新功能。",
                okText: "立即刷新",
                onOk: () => {
                    forceReload();
                },
                closable: false,
                maskClosable: false,
            });
        });

        return cleanup;
    }, []);

    return null;
}
