import axios from "axios";
import type { AiConfig, ApiCallFormat, ModelChannel } from "@/stores/use-config-store";
import { createModelChannel, normalizeChannelModels } from "@/stores/use-config-store";

export type Sub2ApiLoginRequest = {
    email: string;
    password: string;
    sub2apiUrl: string;
};

export type Sub2ApiLoginResponse = {
    code: number;
    message: string;
    data: {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type: string;
        user: {
            id: number;
            email: string;
            [key: string]: unknown;
        };
    };
};

export type Sub2ApiGroup = {
    id: number;
    name: string;
    description: string;
    platform: string;
    allow_image_generation: boolean;
    [key: string]: unknown;
};

export type Sub2ApiKey = {
    id: number;
    user_id: number;
    key: string;
    name: string;
    group_id: number;
    status: string;
    group: Sub2ApiGroup;
    [key: string]: unknown;
};

export type Sub2ApiKeysResponse = {
    code: number;
    message: string;
    data: {
        items: Sub2ApiKey[];
        total: number;
        [key: string]: unknown;
    };
};

export type Sub2ApiModelsResponse = {
    data?: Array<{
        id: string;
        object: string;
        [key: string]: unknown;
    }>;
};

/**
 * 登录 Sub2API
 */
export async function loginSub2Api(request: Sub2ApiLoginRequest): Promise<string> {
    // 开发环境使用代理，生产环境直接访问
    const baseUrl = import.meta.env.DEV && request.sub2apiUrl === "https://api.panlai.me"
        ? ""
        : request.sub2apiUrl.replace(/\/+$/, "");
    const url = `${baseUrl}/api/v1/auth/login`;
    try {
        const response = await axios.post<Sub2ApiLoginResponse>(url, {
            email: request.email,
            password: request.password,
        });

        if (response.data.code !== 0 || !response.data.data?.access_token) {
            throw new Error(response.data.message || "登录失败");
        }

        return response.data.data.access_token;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.message || error.message;
            throw new Error(`登录失败: ${message}`);
        }
        throw error;
    }
}

/**
 * 获取用户的 API Keys
 */
export async function fetchSub2ApiKeys(sub2apiUrl: string, accessToken: string): Promise<Sub2ApiKey[]> {
    // 开发环境使用代理，生产环境直接访问
    const baseUrl = import.meta.env.DEV && sub2apiUrl === "https://api.panlai.me"
        ? ""
        : sub2apiUrl.replace(/\/+$/, "");
    const url = `${baseUrl}/api/v1/keys`;
    try {
        const response = await axios.get<Sub2ApiKeysResponse>(url, {
            params: {
                page: 1,
                page_size: 100,
            },
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (response.data.code !== 0 || !response.data.data?.items) {
            throw new Error(response.data.message || "获取 API Keys 失败");
        }

        return response.data.data.items;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.message || error.message;
            throw new Error(`获取 API Keys 失败: ${message}`);
        }
        throw error;
    }
}

/**
 * 筛选生图组的 API Keys
 */
export function filterImageGenerationKeys(keys: Sub2ApiKey[]): Sub2ApiKey[] {
    return keys.filter((key) => {
        // 必须有 group 信息
        if (!key.group || !key.group.name) return false;
        // 状态必须是 active
        if (key.status !== "active") return false;
        // 分组名称必须包含 "生图组"
        if (!key.group.name.includes("生图组")) return false;
        // 必须允许图片生成
        if (!key.group.allow_image_generation) return false;
        return true;
    });
}

/**
 * 将 Sub2API 的 platform 映射到我们的 apiFormat
 */
export function mapPlatformToApiFormat(platform: string): ApiCallFormat {
    const lowerPlatform = platform.toLowerCase();
    if (lowerPlatform === "gemini") return "gemini";
    if (lowerPlatform === "grok") return "grok";
    if (lowerPlatform === "anthropic") return "openai"; // Anthropic 也用 OpenAI 格式
    if (lowerPlatform === "openai") return "openai";
    // 默认使用 OpenAI 格式
    return "openai";
}

/**
 * 从 Sub2API 拉取指定 API Key 的模型列表
 */
export async function fetchModelsFromSub2Api(sub2apiUrl: string, apiKey: string): Promise<string[]> {
    // 开发环境使用代理，生产环境直接访问
    const baseUrl = import.meta.env.DEV && sub2apiUrl === "https://api.panlai.me"
        ? ""
        : sub2apiUrl.replace(/\/+$/, "");
    const url = `${baseUrl}/v1/models`;
    try {
        const response = await axios.get<Sub2ApiModelsResponse>(url, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });

        if (!response.data?.data || !Array.isArray(response.data.data)) {
            return [];
        }

        return response.data.data.map((model) => model.id).filter(Boolean);
    } catch (error) {
        console.error("拉取模型列表失败:", error);
        // 拉取失败不抛出错误，返回空数组
        return [];
    }
}

/**
 * 从 Sub2API 同步渠道配置
 */
export async function syncChannelsFromSub2Api(request: Sub2ApiLoginRequest): Promise<ModelChannel[]> {
    // 1. 登录获取 access token
    const accessToken = await loginSub2Api(request);

    // 2. 获取所有 API Keys
    const allKeys = await fetchSub2ApiKeys(request.sub2apiUrl, accessToken);

    // 3. 筛选出生图组的 Keys
    const imageKeys = filterImageGenerationKeys(allKeys);

    if (imageKeys.length === 0) {
        throw new Error("未找到可用的生图组 API Key");
    }

    // 4. 为每个 Key 创建渠道配置
    const channels: ModelChannel[] = [];
    for (const key of imageKeys) {
        const apiFormat = mapPlatformToApiFormat(key.group.platform);

        // 拉取该 Key 的模型列表
        const models = await fetchModelsFromSub2Api(request.sub2apiUrl, key.key);

        const channel = createModelChannel({
            name: key.group.name, // 使用 group 名称作为渠道名称
            baseUrl: request.sub2apiUrl,
            apiKey: key.key,
            apiFormat,
            models: normalizeChannelModels(models.map(name => ({ name, capability: "image" }))),
        });

        channels.push(channel);
    }

    return channels;
}
