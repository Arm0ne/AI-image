import { useState } from "react";
import { Modal, Form, Input, Button, message, Alert } from "antd";
import { useTranslation } from "react-i18next";
import { syncChannelsFromSub2Api } from "@/services/sub2api-sync";
import { useConfigStore } from "@/stores/use-config-store";
import { modelOptionsFromChannels } from "@/stores/use-config-store";

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
    const { config, updateConfig } = useConfigStore();

    const handleSync = async (values: FormValues) => {
        setLoading(true);
        try {
            // 同步渠道配置
            const channels = await syncChannelsFromSub2Api({
                sub2apiUrl: values.sub2apiUrl,
                email: values.email,
                password: values.password,
            });

            // 合并到现有渠道配置中（保留原有的非生图组渠道）
            const existingChannels = config.channels.filter(
                (ch) => !ch.name.includes("生图组")
            );
            const mergedChannels = [...existingChannels, ...channels];

            // 更新配置
            updateConfig("channels", mergedChannels);
            updateConfig("models", modelOptionsFromChannels(mergedChannels));

            // 如果当前没有选中图片模型，自动选择第一个生图组的第一个模型
            if (!config.imageModel && channels.length > 0 && channels[0].models.length > 0) {
                const firstModel = `${channels[0].id}::${channels[0].models[0].name}`;
                updateConfig("imageModel", firstModel);
                updateConfig("model", firstModel);
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
            title="从 Sub2API 同步渠道"
            open={open}
            onCancel={onClose}
            footer={null}
            width={500}
        >
            <Alert
                message="提示"
                description="登录后将自动拉取您的生图组 API Keys 并配置到本地渠道。"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <Form
                form={form}
                layout="vertical"
                onFinish={handleSync}
                initialValues={{
                    sub2apiUrl: "https://api.panlai.me",
                }}
            >
                <Form.Item
                    label="Sub2API 地址"
                    name="sub2apiUrl"
                    rules={[
                        { required: true, message: "请输入 Sub2API 地址" },
                        { type: "url", message: "请输入有效的 URL" },
                    ]}
                >
                    <Input placeholder="https://api.panlai.me" />
                </Form.Item>

                <Form.Item
                    label="邮箱"
                    name="email"
                    rules={[
                        { required: true, message: "请输入邮箱" },
                        { type: "email", message: "请输入有效的邮箱地址" },
                    ]}
                >
                    <Input placeholder="your@email.com" />
                </Form.Item>

                <Form.Item
                    label="密码"
                    name="password"
                    rules={[{ required: true, message: "请输入密码" }]}
                >
                    <Input.Password placeholder="请输入密码" />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <Button onClick={onClose}>
                            取消
                        </Button>
                        <Button type="primary" htmlType="submit" loading={loading}>
                            登录并同步
                        </Button>
                    </div>
                </Form.Item>
            </Form>
        </Modal>
    );
}
