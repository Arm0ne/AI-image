import { afterAll, afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import axios from "axios";

// Keep browser persistence and network requests isolated from real user data and APIs.
const databases = new Map<string, Map<string, unknown>>();
function database(name: string) {
    if (!databases.has(name)) databases.set(name, new Map());
    return databases.get(name)!;
}
mock.module("localforage", () => ({ default: {
    createInstance: ({ storeName }: { storeName: string }) => ({
        getItem: async (key: string) => database(storeName).get(key) ?? null,
        setItem: async (key: string, value: unknown) => { database(storeName).set(key, value); return value; },
        removeItem: async (key: string) => { database(storeName).delete(key); },
        iterate: async (visit: (value: unknown, key: string) => void) => { database(storeName).forEach(visit); },
    }),
} }));
mock.module("@/i18n", () => ({ default: { t: (key: string) => key } }));
mock.module("@/stores/use-config-store", () => ({
    withLocalProxy: (url: string) => url,
    buildApiUrl: (base: string, path: string) => `${base}${path}`,
    resolveModelRequestConfig: (config: unknown) => config,
    resolveModelScript: () => "",
}));
const refreshBalance = mock(() => {});
mock.module("@/services/sub2api-sync", () => ({ requestUserInfoRefresh: refreshBalance }));
mock.module("@/services/api/model-plugin", () => ({ normalizePluginImages: () => [], runModelPlugin: async () => [] }));

const storage = await import("../src/services/image-storage");
const { requestGeneration, requestEdit } = await import("../src/services/api/image");
const files = database("image_files");
const previews = database("image_previews");
const original = new Blob(["original"], { type: "image/png" });
const thumbnail = new Blob(["preview"], { type: "image/webp" });
const bitmap = () => ({ width: 2048, height: 1024, close() {} });
const decode = mock(async () => bitmap());
const previousGlobals = new Map(["createImageBitmap", "document", "window", "Image"].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
Object.assign(globalThis, {
    createImageBitmap: decode,
    document: { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {} }), toBlob: (callback: (blob: Blob) => void) => callback(thumbnail) }) },
    window: globalThis,
    Image: class {
        naturalWidth = 2048;
        naturalHeight = 1024;
        onload?: () => void;
        set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    },
});

beforeEach(() => { decode.mockClear(); refreshBalance.mockClear(); });
afterEach(() => { mock.restore(); });

test("concurrent thumbnail consumers decode once and retain the original", async () => {
    files.set("image:shared", original);
    const urls = await Promise.all(Array.from({ length: 12 }, () => storage.ensureImagePreview("image:shared")));
    expect(new Set(urls).size).toBe(1);
    expect(urls[0]).toStartWith("blob:");
    expect(decode).toHaveBeenCalledTimes(1);
    expect(await storage.getImageBlob("image:shared")).toBe(original);
    expect(await storage.ensureImagePreview("image:shared")).toBe(urls[0]);
    expect(decode).toHaveBeenCalledTimes(1);
});

test("persisted previews load without decoding the full image", async () => {
    files.set("image:cached", original);
    previews.set("image:cached", { version: 1, blob: thumbnail });
    expect(await storage.ensureImagePreview("image:cached")).toStartWith("blob:");
    expect(decode).not.toHaveBeenCalled();
});

test("small images are not enlarged or repeatedly decoded", async () => {
    files.set("image:small", original);
    decode.mockImplementationOnce(async () => ({ width: 64, height: 32, close() {} }));
    expect(await storage.ensureImagePreview("image:small")).toBeUndefined();
    expect(await storage.ensureImagePreview("image:small")).toBeUndefined();
    expect(decode).toHaveBeenCalledTimes(1);
    expect(await storage.resolveImageUrl("image:small")).toStartWith("blob:");
});

test("thumbnail failure leaves the original available", async () => {
    files.set("image:fallback", original);
    decode.mockImplementationOnce(async () => { throw new Error("decoder unavailable"); });
    expect(await storage.ensureImagePreview("image:fallback")).toBeUndefined();
    expect(await storage.getImageBlob("image:fallback")).toBe(original);
    expect(await storage.resolveImageUrl("image:fallback")).toStartWith("blob:");
});

test("deleting an image during preview creation does not leave an orphan", async () => {
    files.set("image:deleted", original);
    const started = Promise.withResolvers<void>();
    const resume = Promise.withResolvers<ReturnType<typeof bitmap>>();
    decode.mockImplementationOnce(() => { started.resolve(); return resume.promise; });
    const pending = storage.ensureImagePreview("image:deleted");
    await started.promise;
    const deletion = storage.deleteStoredImages(["image:deleted"]);
    resume.resolve(bitmap());
    await Promise.all([pending, deletion]);
    expect(files.has("image:deleted")).toBe(false);
    expect(previews.has("image:deleted")).toBe(false);
    expect(storage.previewUrlFor("image:deleted")).toBeUndefined();
});

test("canceling upload during thumbnail creation removes both new files", async () => {
    const beforeFiles = files.size;
    const beforePreviews = previews.size;
    const controller = new AbortController();
    decode.mockImplementationOnce(async () => { controller.abort(); return bitmap(); });
    await expect(storage.uploadImage(original, { signal: controller.signal })).rejects.toHaveProperty("name", "AbortError");
    expect(files.size).toBe(beforeFiles);
    expect(previews.size).toBe(beforePreviews);
});

test("cleanup protects images and previews referenced by generation history", async () => {
    files.set("image:history", original);
    files.set("image:unused", original);
    previews.set("image:history", { version: 1, blob: thumbnail });
    previews.set("image:orphan", { version: 1, blob: thumbnail });
    database("image_generation_logs").set("log", { images: [{ storageKey: "image:history" }] });
    await storage.cleanupUnusedImages({});
    expect(files.get("image:history")).toBe(original);
    expect(previews.has("image:history")).toBe(true);
    expect(files.has("image:unused")).toBe(false);
    expect(previews.has("image:orphan")).toBe(false);
});

const config = { baseUrl: "https://example.invalid/v1", apiKey: "test-key", apiFormat: "openai", model: "gpt-image-2", systemPrompt: "", size: "auto", quality: "auto", count: 1 } as Parameters<typeof requestGeneration>[0];
const references = [{ id: "ref", name: "reference", dataUrl: "data:image/png;base64,b3JpZ2luYWw=" }];
for (const operation of ["generation", "edit", "gemini"] as const) {
    test(`${operation} uses the upstream timeout, keeps cancellation and refreshes balance`, async () => {
        const post = spyOn(axios, "post").mockResolvedValue({ data: operation === "gemini"
            ? { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: "aW1hZ2U=" } }] } }] }
            : { data: [{ b64_json: "aW1hZ2U=" }] } });
        const controller = new AbortController();
        const options = { signal: controller.signal };
        const images = operation === "edit" ? await requestEdit(config, "test", references, options)
            : await requestGeneration(operation === "gemini" ? { ...config, apiFormat: "gemini", model: "gemini-3-pro" } : config, "test", options);
        expect(images).toHaveLength(1);
        expect(post.mock.calls[0][2]).toMatchObject({ timeout: 600_000, signal: controller.signal });
        expect(refreshBalance).toHaveBeenCalledTimes(1);
    });
}

test("timeouts are distinct from cancellation and gateway errors", async () => {
    const post = spyOn(axios, "post");
    post.mockRejectedValueOnce(new axios.AxiosError("timeout", "ECONNABORTED"));
    await expect(requestGeneration(config, "test")).rejects.toThrow("apiErrors.imageTimeout");
    post.mockRejectedValueOnce(new axios.CanceledError("canceled"));
    await expect(requestGeneration(config, "test")).rejects.toThrow("apiErrors.requestCanceled");
    post.mockRejectedValueOnce(new axios.AxiosError("gateway", "ERR_BAD_RESPONSE", undefined, undefined, { status: 502, data: "<html>Bad gateway</html>" } as never));
    await expect(requestGeneration(config, "test")).rejects.toThrow("apiErrors.badGateway");
    expect(refreshBalance).not.toHaveBeenCalled();
});

// Restore globals when this test file finishes, without touching actual browser storage.
afterAll(() => {
    for (const [name, descriptor] of previousGlobals) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
    }
});
