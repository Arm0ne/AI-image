import { afterAll, expect, mock, test } from "bun:test";

mock.module("@/i18n", () => ({ default: { t: (key: string) => key } }));

// Exercise the real persist merge without accessing browser data or making requests.
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: { getItem: () => null, setItem() {}, removeItem() {} } },
});
afterAll(() => {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
});

const { createModelChannel, defaultConfig, encodeChannelModel, resolveModelRequestConfig, buildApiUrl, useConfigStore } = await import("../src/stores/use-config-store");

test("loading saved channels switches endpoints before model sync without losing settings", () => {
    const channel = {
        ...createModelChannel({ id: "saved-image", apiKey: "test-key", models: [{ name: "gpt-image-2.5", capability: "image", script: "return baseUrl", source: "manual" }] }),
        baseUrl: "https://api.panlai.me/v1",
    };
    const selected = encodeChannelModel(channel.id, "gpt-image-2.5");
    const savedConfig = { ...defaultConfig, baseUrl: "https://api.panlai.me", apiKey: "test-key", channels: [channel], imageModel: selected, model: selected };
    const merge = useConfigStore.persist.getOptions().merge!;
    const { config } = merge({ config: savedConfig }, useConfigStore.getState());

    expect(config.baseUrl).toBe("https://server.panlai.me");
    expect(config.channels[0]).toEqual({ ...channel, baseUrl: "https://server.panlai.me/v1" });
    expect(config.imageModel).toBe(selected);
    expect(config.model).toBe(selected);
    expect(config.apiKey).toBe("test-key");
    expect(savedConfig.channels[0].baseUrl).toBe("https://api.panlai.me/v1");
    const requestConfig = resolveModelRequestConfig(config, selected);
    expect(buildApiUrl(requestConfig.baseUrl, "/images/generations")).toBe("https://server.panlai.me/v1/images/generations");
});

test("old service URLs keep their API paths and URL parameters", () => {
    for (const [previous, next] of [
        ["https://api.panlai.me/", "https://server.panlai.me"],
        ["https://API.PANLAI.ME:443/v1beta", "https://server.panlai.me/v1beta"],
        ["https://api.panlai.me/custom/v1?mode=image#settings", "https://server.panlai.me/custom/v1?mode=image#settings"],
    ]) {
        expect(createModelChannel({ baseUrl: previous }).baseUrl).toBe(next);
        expect(createModelChannel({ baseUrl: next }).baseUrl).toBe(next);
    }
});

test("custom addresses and URLs that only mention the old hostname remain unchanged", () => {
    for (const baseUrl of [
        "https://custom.example/v1",
        "https://api.panlai.me.example/v1",
        "https://custom.example/api.panlai.me?next=https://api.panlai.me",
        "https://api.panlai.me:8443/v1",
        "/custom-proxy",
    ]) {
        expect(createModelChannel({ baseUrl }).baseUrl).toBe(baseUrl);
    }
});
