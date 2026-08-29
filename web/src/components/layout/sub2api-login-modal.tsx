import { useState } from "react";
import { Modal, Form, Input, Button, message, Alert } from "antd";
import { useTranslation } from "react-i18next";
import { syncChannelsFromSub2Api } from "@/services/sub2api-sync";
import { modelOptionsFromChannels, preferredImageModelFromChannels, useConfigStore } from "@/stores/use-config-store";
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
    const [form] = Form.useForm<FormValues>();
    const [loading, setLoading] = useState(false);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const setUserInfo = useUserStore((state) => state.setUserInfo);
    const setAccessToken = useUserStore((state) => state.setAccessToken);

    const handleSync = async (values: FormValues) => {
        setLoading(true);
        try {
            // 同步渠道配置，使用固定的 API 地址
            const { channels, userInfo, accessToken } = await syncChannelsFromSub2Api({
                sub2apiUrl: "https://api.panlai.me",
                email: values.email,
                password: values.password,
            });

            // 保存用户信息和 access token
            setUserInfo(userInfo);
            setAccessToken(accessToken);

            // 完全替换现有渠道配置
            updateConfig("channels", channels);
            updateConfig("models", modelOptionsFromChannels(channels));

            // 登录同步后优先使用 Image2；没有 Image2 时才回退到第一个图片模型。
            const preferredImageModel = preferredImageModelFromChannels(channels);
            if (preferredImageModel) {
                updateConfig("imageModel", preferredImageModel);
                updateConfig("model", preferredImageModel);
            }

            message.success(`成功同步 ${channels.length} 个生图组渠道`);
            form.resetFields();
            onClose();
        } catch (error) {
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
                message={
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
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <Button onClick={onClose}>
                            {t("common.cancel")}
                        </Button>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            {t("config.channels.loginAndSync")}
                        </Button>
                    </div>
                </Form.Item>
            </Form>
        </Modal>
    );
}
