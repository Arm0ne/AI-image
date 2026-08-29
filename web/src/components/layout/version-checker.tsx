import { useEffect, useState } from "react";
import { Modal, Alert, Button } from "antd";
import { checkVersionUpdate, forceReload, startVersionCheck } from "@/utils/version-check";

/**
 * 版本检测组件
 * 在应用启动时检测版本，发现更新时提示用户刷新
 */
export function VersionChecker() {
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        // 1. 启动时检查本地存储的版本
        if (checkVersionUpdate()) {
            // 检测到版本更新，直接强制刷新（静默）
            forceReload();
            return;
        }

        // 2. 启动定期检查（检查服务器版本文件）
        const cleanup = startVersionCheck(() => {
            // 检测到服务器版本更新，显示弹窗
            setShowModal(true);
        });

        return cleanup;
    }, []);

    const handleRefresh = () => {
        forceReload();
    };

    return (
        <Modal
            title="发现新版本"
            open={showModal}
            onCancel={() => {}}
            closable={false}
            maskClosable={false}
            footer={null}
            width={500}
            styles={{
                content: {
                    backgroundColor: "rgb(30, 41, 59)",
                    color: "rgb(226, 232, 240)",
                },
                header: {
                    backgroundColor: "rgb(30, 41, 59)",
                    color: "rgb(226, 232, 240)",
                },
            }}
        >
            <Alert
                message="检测到新版本已发布，点击立即刷新按钮以获得最佳体验和最新功能。"
                type="info"
                showIcon
                style={{
                    marginBottom: 16,
                    padding: '8px 12px',
                    backgroundColor: "rgba(217, 119, 6, 0.1)",
                    border: "1px solid rgba(217, 119, 6, 0.2)",
                }}
                className="text-xs"
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button type="primary" onClick={handleRefresh}>
                    立即刷新
                </Button>
            </div>
        </Modal>
    );
}
