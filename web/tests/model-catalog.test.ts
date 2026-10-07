import { expect, mock, test } from "bun:test";

mock.module("@/i18n", () => ({ default: { t: (key: string) => key } }));

const { applySyncedChannels, createModelChannel, defaultConfig, encodeChannelModel } = await import("../src/stores/use-config-store");

function channel(id: string, models: Array<{ name: string; capability?: "image" | "text"; script?: string }>) {
    return createModelChannel({
        id,
        syncKey: "sub2api-key:1",
        name: "Images",
        baseUrl: "https://models.example/v1",
        apiKey: "test-key",
        models: models.map((model) => ({ capability: "image", ...model })),
    });
}

test("prefers gpt-image-2.5 and keeps synchronized channel identity and model scripts", () => {
    const currentChannel = channel("saved-channel", [{ name: "gpt-image-2", script: "custom script" }]);
    const incomingChannel = channel("new-server-id", [{ name: "gpt-image-2" }, { name: "gpt-image-2.5-preview" }]);
    const current = {
        ...defaultConfig,
        channels: [currentChannel],
        models: [encodeChannelModel(currentChannel.id, "gpt-image-2")],
        imageModel: encodeChannelModel(currentChannel.id, "gpt-image-2"),
        model: encodeChannelModel(currentChannel.id, "gpt-image-2"),
    };

    const next = applySyncedChannels(current, [incomingChannel]);

    expect(next.channels[0].id).toBe("saved-channel");
    expect(next.channels[0].models.find((item) => item.name === "gpt-image-2")?.script).toBe("custom script");
    expect(next.imageModel).toBe(encodeChannelModel("saved-channel", "gpt-image-2.5-preview"));
    expect(next.model).toBe(next.imageModel);
});

test("preserves a user's manually selected model while adding newly available models", () => {
    const currentChannel = channel("saved-channel", [{ name: "dall-e-3" }]);
    const incomingChannel = channel("new-server-id", [{ name: "dall-e-3" }, { name: "gpt-image-2.5" }]);
    const selectedModel = encodeChannelModel("saved-channel", "dall-e-3");
    const current = { ...defaultConfig, channels: [currentChannel], imageModel: selectedModel, model: selectedModel };

    const next = applySyncedChannels(current, [incomingChannel]);

    expect(next.imageModel).toBe(selectedModel);
    expect(next.model).toBe(selectedModel);
    expect(next.channels[0].models.map((item) => item.name)).toContain("gpt-image-2.5");
});

test("falls back when the selected model is removed and drops removed synchronized channels", () => {
    const currentChannel = channel("saved-channel", [{ name: "retired-image-model" }, { name: "gpt-image-2.5" }, { name: "manual-image", source: "manual" }]);
    const removedChannel = createModelChannel({ syncKey: "sub2api-key:removed", name: "Removed", baseUrl: currentChannel.baseUrl, apiKey: "old-key", models: [{ name: "old-model", capability: "image" }] });
    const manualChannel = createModelChannel({ id: "manual-channel", name: "Manual", baseUrl: "https://manual.example/v1", apiKey: "manual-key", models: [{ name: "manual-image", capability: "image" }] });
    const current = {
        ...defaultConfig,
        channels: [currentChannel, removedChannel, manualChannel],
        imageModel: encodeChannelModel("saved-channel", "retired-image-model"),
    };

    const next = applySyncedChannels(current, [channel("server-id", [{ name: "gpt-image-2.5" }])]);

    expect(next.imageModel).toBe(encodeChannelModel("saved-channel", "gpt-image-2.5"));
    expect(next.channels.map((item) => item.id)).toEqual(["saved-channel", "manual-channel"]);
    expect(next.channels[0].models.map((item) => item.name)).toContain("manual-image");
    expect(next.channels[0].models.map((item) => item.name)).not.toContain("retired-image-model");
});
