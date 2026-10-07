import { useState } from "react";
import { App, Modal, Form, Input, Button, Alert } from "antd";
import { useTranslation } from "react-i18next";
import { SUB2API_URL, Sub2ApiAuthenticationError, syncChannelsFromSub2Api } from "@/services/sub2api-sync";
import { applySyncedChannels, useConfigStore } from "@/stores/use-config-store";
import { useUserStore } from "@/stores/use-user-store";

type Sub2ApiLoginModalProps = {
    open: boolean;
    onClose: () => void;
};

type FormValues = {
    sub2apiUrl: string;
    email: string;
    password: string;
};

export function Sub2ApiLoginModal({ open, onClose }: Sub2ApiLoginModalProps) {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const [form] = Form.useForm<FormValues>();
    const [loading, setLoading] = useState(false);
    const replaceConfig = useConfigStore((state) => state.replaceConfig);
    const setUserInfo = useUserStore((state) => state.setUserInfo);
    const setAccessToken = useUserStore((state) => state.setAccessToken);
    const setModelCatalogLastSyncedAt = useUserStore((state) => state.setModelCatalogLastSyncedAt);
    const clearUserInfo = useUserStore((state) => state.clearUserInfo);
    const clearAiCredentials = useConfigStore((state) => state.clearAiCredentials);

    const handleSync = async (values: FormValues) => {
        setLoading(true);
        try {
            // 同步渠道配置，使用固定的 API 地址
            const { channels, userInfo, accessToken } = await syncChannelsFromSub2Api({
                sub2apiUrl: SUB2API_URL,
                email: values.email,
                password: values.password,
            });

            // 保存用户信息和 access token
            setUserInfo(userInfo);
            setAccessToken(accessToken);

            // 登录同步后优先使用 gpt-image-2.5；没有时回退到 Image2 或第一个图片模型。
            const nextConfig = applySyncedChannels(useConfigStore.getState().config, channels, false);
            replaceConfig(nextConfig);
            setModelCatalogLastSyncedAt(Date.now());

            message.success(`成功同步 ${channels.length} 个生图组渠道`);
            form.resetFields();
            onClose();
        } catch (error) {
            if (error instanceof Sub2ApiAuthenticationError) {
                clearAiCredentials();
                clearUserInfo();
                message.error(error.message);
                return;
            }
            const errorMessage = error instanceof Error ? error.message : "同步失败";
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={t("config.channels.loginTitle")}
            open={open}
            onCancel={onClose}
            footer={null}
            width={500}
        >
            <Alert
                title={
                    <>
                        登录后将自动拉取您的生图组 API 密钥并配置到工作台
                        <br />
                        (请务必先在Alien API站点创建API密钥并选择正确的生图分组)
                    </>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16, padding: '8px 12px' }}
                className="text-xs"
            />

            <Form
                form={form}
                layout="vertical"
                onFinish={handleSync}
            >
                <Form.Item
                    label={t("config.channels.email")}
                    name="email"
                    rules={[
                        { required: true, message: t("config.channels.email") },
                        { type: "email", message: t("config.channels.email") },
                    ]}
                >
                    <Input placeholder={t("config.channels.emailPlaceholder")} />
                </Form.Item>

                <Form.Item
                    label={t("config.channels.password")}
                    name="password"
                    rules={[{ required: true, message: t("config.channels.password") }]}
                >
                    <Input.Password placeholder={t("config.channels.passwordPlaceholder")} />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Button
                            type="primary"
                            href={SUB2API_URL}
                            target="_blank"
                            className="w-full sm:w-auto"
                        >
                            注册API账号
                        </Button>
                        <div className="flex w-full gap-2 sm:w-auto">
                            <Button onClick={onClose} className="min-w-0 flex-1 sm:flex-none">
                                {t("common.cancel")}
                            </Button>
                            <Button type="primary" htmlType="submit" loading={loading} className="min-w-0 flex-1 sm:flex-none">
                                {t("config.channels.loginAndSync")}
                            </Button>
                        </div>
                    </div>
                </Form.Item>
            </Form>
        </Modal>
    );
}
