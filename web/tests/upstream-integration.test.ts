import { afterAll, afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import axios from "axios";
import type { GenerationLog } from "../src/pages/image/generation";

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

const generation = await import("../src/pages/image/generation");
const { useGenerationStore } = await import("../src/stores/use-generation-store");
const { cancelAiRequests } = await import("../src/lib/ai-request-registry");
const histories = database("image_generation_logs");
const imageResponse = { data: { data: [{ b64_json: "aW1hZ2U=" }] } };

function resetGeneration() {
    histories.clear();
    useGenerationStore.setState({ tasks: [], historyRevision: 0 });
}

async function failedRecord() {
    const post = spyOn(axios, "post").mockRejectedValue(new Error("initial failure"));
    const originalTask = generation.createGenerationTask("retry this image", config, [], 1);
    originalTask.createdAt -= 60_000;
    await generation.runGenerationTask(originalTask, config);
    return { log: await generation.logStore.getItem<GenerationLog>(originalTask.id), post };
}

test("retry resets progress on the same history card and blocks duplicate requests", async () => {
    resetGeneration();
    const { log, post } = await failedRecord();
    const retry = generation.createRetryTask(log!, log!.slots![0].id)!;
    const response = Promise.withResolvers<typeof imageResponse>();
    post.mockClear();
    post.mockImplementation(() => response.promise);
    const pending = generation.runGenerationTask(retry, config);
    const running = useGenerationStore.getState().tasks[0];
    expect(running.id).toBe(log!.id);
    expect(running.createdAt).toBe(log!.createdAt);
    expect(running.startedAt! - running.createdAt).toBeGreaterThanOrEqual(60_000);
    expect(running.images[0].status).toBe("pending");
    expect(running.failCount).toBe(0);
    const other = { ...log!, id: "other-record" };
    const rows = generation.mergeGenerationRecords([other, log!], useGenerationStore.getState().tasks);
    expect(rows.map((row) => row.log.id)).toEqual([other.id, log!.id]);
    expect(rows[1].task?.status).toBe("running");
    expect(await generation.runGenerationTask(retry, config)).toBeUndefined();
    expect(post).toHaveBeenCalledTimes(1);
    response.resolve(imageResponse);
    await pending;
    expect(histories.size).toBe(1);
    const saved = await generation.logStore.getItem<GenerationLog>(log!.id);
    expect(saved).toMatchObject({ id: log!.id, createdAt: log!.createdAt, successCount: 1, failCount: 0 });
    expect(saved!.slots![0]).toMatchObject({ id: retry.images[0].id, status: "success" });
    expect(saved!.images[0].storageKey).toStartWith("image:");
    expect(saved!.images[0].dataUrl).toBe("");
    expect(useGenerationStore.getState().tasks).toHaveLength(0);
    expect(useGenerationStore.getState().historyRevision).toBe(2);
});

test("retrying one failed slot preserves successful images and other failures after reloading history", async () => {
    resetGeneration();
    const post = spyOn(axios, "post").mockResolvedValueOnce(imageResponse).mockRejectedValueOnce(new Error("second failed")).mockRejectedValueOnce(new Error("third failed"));
    const task = generation.createGenerationTask("three images", config, [], 3);
    await generation.runGenerationTask(task, config);
    const originalLog = await generation.logStore.getItem<GenerationLog>(task.id);
    const loaded = await generation.hydrateLogMedia(originalLog!);
    expect(generation.generationLogToResults(loaded).map((slot) => slot.status)).toEqual(["success", "failed", "failed"]);
    const originalImage = loaded.images[0];
    const retry = generation.createRetryTask(loaded, task.images[2].id)!;
    expect(retry.images.map((slot) => slot.status)).toEqual(["success", "failed", "pending"]);
    post.mockClear();
    post.mockResolvedValue(imageResponse);
    await generation.runGenerationTask(retry, config);
    expect(post).toHaveBeenCalledTimes(1);
    const saved = await generation.logStore.getItem<GenerationLog>(task.id);
    expect(saved).toMatchObject({ successCount: 2, failCount: 1, imageCount: 3 });
    expect(saved!.images[0].storageKey).toBe(originalImage.storageKey);
    expect(saved!.slots!.map((slot) => slot.id)).toEqual(task.images.map((slot) => slot.id));
    expect(saved!.slots!.map((slot) => slot.status)).toEqual(["success", "failed", "success"]);
    expect(histories.size).toBe(1);
});

test("failed retries save the new error on the original record and can be retried again", async () => {
    resetGeneration();
    const { log, post } = await failedRecord();
    post.mockRejectedValue(new Error("retry failed again"));
    await generation.runGenerationTask(generation.createRetryTask(log!, log!.slots![0].id)!, config);
    const saved = await generation.logStore.getItem<GenerationLog>(log!.id);
    expect(saved!.slots![0]).toMatchObject({ status: "failed", error: "retry failed again" });
    expect(histories.size).toBe(1);
    expect(generation.createRetryTask(saved!, saved!.slots![0].id)?.id).toBe(log!.id);
});

test("a new generation gets a distinct history record while an older retry finishes independently", async () => {
    resetGeneration();
    const { log, post } = await failedRecord();
    const retryResponse = Promise.withResolvers<typeof imageResponse>();
    const newResponse = Promise.withResolvers<typeof imageResponse>();
    post.mockImplementationOnce(() => retryResponse.promise).mockImplementationOnce(() => newResponse.promise);
    const retry = generation.createRetryTask(log!, log!.slots![0].id)!;
    const pendingRetry = generation.runGenerationTask(retry, config);
    const next = generation.createGenerationTask("different record", config, [], 1);
    const pendingNew = generation.runGenerationTask(next, config);
    expect(next.id).not.toBe(log!.id);
    retryResponse.resolve(imageResponse);
    await pendingRetry;
    expect(useGenerationStore.getState().tasks).toHaveLength(1);
    expect(useGenerationStore.getState().tasks[0]).toMatchObject({ id: next.id, status: "running" });
    newResponse.resolve(imageResponse);
    await pendingNew;
    expect(histories.size).toBe(2);
});

test("logout cancellation ends a retry without losing its original history identity", async () => {
    resetGeneration();
    const { log, post } = await failedRecord();
    post.mockImplementation((_url, _body, options) => new Promise((_resolve, reject) => options!.signal!.addEventListener!("abort", () => reject(new axios.CanceledError("canceled")))));
    const pending = generation.runGenerationTask(generation.createRetryTask(log!, log!.slots![0].id)!, config);
    cancelAiRequests();
    expect((await pending)?.canceled).toBe(true);
    expect(useGenerationStore.getState().tasks).toHaveLength(0);
    const saved = await generation.logStore.getItem<GenerationLog>(log!.id);
    expect(saved).toMatchObject({ id: log!.id, status: "failed", failCount: 1 });
    expect(saved!.slots![0].error).toBe("apiErrors.requestCanceled");
    expect(histories.size).toBe(1);
});

test("existing failed histories without slot metadata retain a retry target", async () => {
    resetGeneration();
    const { log } = await failedRecord();
    const legacy = { ...log!, slots: undefined };
    const result = generation.generationLogToResults(legacy)[0];
    expect(result.status).toBe("failed");
    expect(generation.createRetryTask(legacy, result.id)?.id).toBe(log!.id);
});

// Restore globals when this test file finishes, without touching actual browser storage.
afterAll(() => {
    for (const [name, descriptor] of previousGlobals) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
    }
});
