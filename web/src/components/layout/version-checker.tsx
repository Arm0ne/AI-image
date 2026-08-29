import { useEffect, useState } from "react";
import { Modal, Alert, Button } from "antd";
import { useTranslation } from "react-i18next";
import { forceReload, startVersionCheck } from "@/utils/version-check";

/**
 * 版本检测组件
 * 在应用启动时检测版本，发现更新时提示用户刷新
 */
export function VersionChecker() {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (import.meta.env.DEV) return;

        const cleanup = startVersionCheck(() => {
            setShowModal(true);
        });

        return cleanup;
    }, []);

    const handleRefresh = () => {
        forceReload();
    };

    return (
        <Modal
            title={t("versionChecker.title")}
            open={showModal}
            onCancel={() => setShowModal(false)}
            footer={[
                <Button key="later" onClick={() => setShowModal(false)}>
                    {t("versionChecker.later")}
                </Button>,
                <Button key="refresh" type="primary" onClick={handleRefresh}>
                    {t("versionChecker.refresh")}
                </Button>,
            ]}
            width={500}
        >
            <Alert
                message={t("versionChecker.description")}
                type="info"
                showIcon
                className="text-xs"
            />
        </Modal>
    );
}
