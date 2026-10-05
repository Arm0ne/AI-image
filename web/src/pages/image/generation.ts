import localforage from "localforage";
import { nanoid } from "nanoid";
import i18n from "@/i18n";
import { registerAiRequest } from "@/lib/ai-request-registry";
import { requestEdit, requestGeneration } from "@/services/api/image";
import { ensureImagePreview, resolveImageUrl, uploadImage } from "@/services/image-storage";
import type { AiConfig } from "@/stores/use-config-store";
import { useGenerationStore, type GenerationTask } from "@/stores/use-generation-store";
import type { ReferenceImage } from "@/types/image";

export type GeneratedImage = { id: string; dataUrl: string; storageKey?: string; durationMs: number; width: number; height: number; bytes: number; mimeType?: string };
export type GenerationResult = { id: string; status: "pending" | "success" | "failed"; image?: GeneratedImage; error?: string };
type GenerationLogConfig = Pick<AiConfig, "model" | "imageModel" | "quality" | "size" | "count"> & Partial<Pick<AiConfig, "background" | "systemPrompt">>;
export type GenerationLog = {
    id: string;
    createdAt: number;
    title: string;
    prompt: string;
    time: string;
    model: string;
    config: GenerationLogConfig;
    references: ReferenceImage[];
    durationMs: number;
    successCount: number;
    failCount: number;
    imageCount: number;
    size: string;
    quality: string;
    status: "success" | "failed";
    images: GeneratedImage[];
    slots?: Array<{ id: string; status: GenerationResult["status"]; error?: string }>;
};

export const logStore = localforage.createInstance({ name: "infinite-canvas", storeName: "image_generation_logs" });

export function generationTaskToResults(task: GenerationTask): GenerationResult[] {
    return task.images.map((image) => ({
        id: image.id,
        status: image.status,
        error: image.error,
        image: image.status === "success" ? { ...image, durationMs: image.durationMs ?? 0, width: image.width ?? 0, height: image.height ?? 0, bytes: image.bytes ?? 0 } : undefined,
    }));
}

export function generationLogToResults(log: GenerationLog): GenerationResult[] {
    if (log.slots) return log.slots.map((slot) => ({ ...slot, image: log.images.find((image) => image.id === slot.id) }));
    // Existing histories stored only successful images. Keep those and restore their failed slots.
    return [...log.images.map((image): GenerationResult => ({ id: image.id, status: "success", image })), ...Array.from({ length: log.failCount }, (_, index): GenerationResult => ({ id: `${log.id}:failed:${index}`, status: "failed" }))];
}

export function generationTaskToLog(task: GenerationTask): GenerationLog {
    return {
        id: task.id,
        createdAt: task.createdAt,
        title: task.prompt.slice(0, 12) || i18n.t("workbench.untitled"),
        prompt: task.prompt,
        time: new Date(task.createdAt).toLocaleString(i18n.resolvedLanguage, { hour12: false }),
        model: task.model,
        config: { ...task.settings, model: task.model, imageModel: task.model, quality: task.settings?.quality || "", size: task.settings?.size || "", count: String(task.count) },
        references: task.references || [],
        durationMs: Math.max(0, (task.completedAt || Date.now()) - (task.startedAt || task.createdAt)),
        successCount: task.successCount,
        failCount: task.failCount,
        imageCount: task.count,
        size: task.settings?.size || "",
        quality: task.settings?.quality || "",
        status: task.successCount ? "success" : "failed",
        images: generationTaskToResults(task).flatMap((result) => (result.image ? [result.image] : [])),
        slots: task.images.map(({ id, status, error }) => ({ id, status, error })),
    };
}

export function createGenerationTask(prompt: string, config: AiConfig, references: ReferenceImage[], count: number): GenerationTask {
    const now = Date.now();
    return {
        id: nanoid(),
        prompt,
        model: config.model,
        count,
        references,
        settings: { quality: config.quality, size: config.size, background: config.background, systemPrompt: config.systemPrompt },
        status: "running",
        createdAt: now,
        startedAt: now,
        successCount: 0,
        failCount: 0,
        images: Array.from({ length: count }, () => ({ id: nanoid(), dataUrl: "", status: "pending" })),
    };
}

export function createRetryTask(log: GenerationLog, imageId: string): GenerationTask | undefined {
    const results = generationLogToResults(log);
    if (!results.some((result) => result.id === imageId && result.status === "failed")) return;
    const images: GenerationTask["images"] = results.map((result) =>
        result.id === imageId ? { id: result.id, dataUrl: "", status: "pending" } : { ...result.image, id: result.id, dataUrl: result.image?.dataUrl || "", status: result.status, error: result.error },
    );
    return {
        id: log.id,
        createdAt: log.createdAt,
        startedAt: Date.now(),
        prompt: log.prompt,
        model: log.model,
        count: log.imageCount,
        settings: log.config,
        references: log.references,
        status: "running",
        images,
        successCount: images.filter((image) => image.status === "success").length,
        failCount: images.filter((image) => image.status === "failed").length,
    };
}

export function mergeGenerationRecords(logs: GenerationLog[], tasks: GenerationTask[]) {
    const byId = new Map(tasks.map((task) => [task.id, task]));
    const savedIds = new Set(logs.map((log) => log.id));
    return [...tasks.filter((task) => !savedIds.has(task.id)).map((task) => ({ log: generationTaskToLog(task), task })), ...logs.map((log) => ({ log: byId.has(log.id) ? generationTaskToLog(byId.get(log.id)!) : log, task: byId.get(log.id) }))];
}

// Requests update their own record/slot IDs, never whichever history happens to be on screen.
export async function runGenerationTask(task: GenerationTask, config: AiConfig) {
    const store = useGenerationStore.getState();
    if (!store.addTask(task)) return;
    const controller = new AbortController();
    const unregister = registerAiRequest(controller);
    try {
        await Promise.all(
            task.images
                .filter((image) => image.status === "pending")
                .map(async (slot) => {
                    const startedAt = Date.now();
                    try {
                        const options = { signal: controller.signal };
                        const requestConfig = { ...config, model: task.model, count: "1" };
                        const response = task.references?.length ? await requestEdit(requestConfig, task.prompt, task.references, options) : await requestGeneration(requestConfig, task.prompt, options);
                        if (!response[0]) throw new Error(i18n.t("imageWorkbench.missingResult"));
                        const image = await uploadImage(response[0].dataUrl, options);
                        store.updateTaskImage(task.id, slot.id, {
                            status: "success",
                            dataUrl: image.url,
                            storageKey: image.storageKey,
                            width: image.width,
                            height: image.height,
                            bytes: image.bytes,
                            mimeType: image.mimeType,
                            durationMs: Date.now() - startedAt,
                        });
                    } catch (error) {
                        store.updateTaskImage(task.id, slot.id, { status: "failed", error: error instanceof Error ? error.message : i18n.t("workbench.generationFailed") });
                    }
                }),
        );
        const latest = useGenerationStore.getState().tasks.find((item) => item.id === task.id)!;
        const completed: GenerationTask = { ...latest, status: latest.successCount ? "success" : "failed", completedAt: Date.now() };
        try {
            const log = generationTaskToLog(completed);
            await logStore.setItem(log.id, {
                ...log,
                references: log.references.map((item) => ({ ...item, dataUrl: item.storageKey ? "" : item.dataUrl })),
                images: log.images.map((image) => ({ ...image, dataUrl: image.storageKey ? "" : image.dataUrl })),
            });
            store.removeTask(task.id);
        } catch (error) {
            // Keep the completed task available if local persistence fails.
            store.updateTask(task.id, completed);
            console.error("Failed to save generation log:", error);
        }
        return { task: completed, canceled: controller.signal.aborted };
    } finally {
        unregister();
    }
}

export async function readStoredLogs() {
    const logs: GenerationLog[] = [];
    await logStore.iterate<GenerationLog, void>((value) => {
        logs.push(normalizeLog(value));
    });
    return logs.sort((a, b) => b.createdAt - a.createdAt);
}

function normalizeLog(log: Partial<GenerationLog>): GenerationLog {
    const config: GenerationLogConfig = {
        ...log.config,
        model: log.config?.model || log.model || "",
        imageModel: log.config?.imageModel || log.model || "",
        quality: log.config?.quality || log.quality || "",
        size: log.config?.size || log.size || "",
        count: log.config?.count || String(log.imageCount || log.successCount || 1),
    };
    return {
        ...log,
        id: log.id || nanoid(),
        createdAt: log.createdAt || Date.now(),
        title: log.title || log.model || i18n.t("workbench.untitled"),
        prompt: log.prompt || log.title || "",
        time: log.time || "",
        model: log.model || config.imageModel,
        config,
        references: (log.references || []).map((item) => ({ ...item, dataUrl: "" })),
        images: (log.images || []).map((image) => ({ ...image, dataUrl: "" })),
        durationMs: log.durationMs || 0,
        successCount: log.successCount ?? log.imageCount ?? 0,
        failCount: log.failCount || 0,
        imageCount: log.imageCount || log.successCount || 0,
        size: log.size || config.size,
        quality: log.quality || config.quality,
        status: log.status || "success",
    };
}

export async function hydrateLogMedia(log: GenerationLog) {
    [...log.references, ...log.images].forEach((item) => void ensureImagePreview(item.storageKey));
    const [references, images] = await Promise.all([
        Promise.all(log.references.map(async (item) => ({ ...item, dataUrl: await resolveImageUrl(item.storageKey, item.dataUrl) }))),
        Promise.all(log.images.map(async (image) => ({ ...image, dataUrl: await resolveImageUrl(image.storageKey, image.dataUrl) }))),
    ]);
    return { ...log, references, images };
}
