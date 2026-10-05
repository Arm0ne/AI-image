import { create } from "zustand";

import type { ReferenceImage } from "@/types/image";
import type { AiConfig } from "@/stores/use-config-store";

export type GenerationTaskStatus = "pending" | "running" | "completed" | "success" | "failed";

export type GenerationTask = {
    id: string;
    prompt: string;
    model: string;
    count: number;
    references?: ReferenceImage[];
    settings?: Pick<AiConfig, "quality" | "size"> & Partial<Pick<AiConfig, "background" | "systemPrompt">>;
    status: GenerationTaskStatus;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
    successCount: number;
    failCount: number;
    images: Array<{
        id: string;
        dataUrl: string;
        storageKey?: string;
        status: "pending" | "success" | "failed";
        error?: string;
        width?: number;
        height?: number;
        bytes?: number;
        mimeType?: string;
        durationMs?: number;
    }>;
};

type GenerationStore = {
    tasks: GenerationTask[];
    historyRevision: number;
    addTask: (task: GenerationTask) => boolean;
    updateTask: (id: string, patch: Partial<Omit<GenerationTask, "id" | "createdAt">>) => void;
    updateTaskImage: (taskId: string, imageId: string, patch: { status?: "pending" | "success" | "failed"; dataUrl?: string; storageKey?: string; error?: string; width?: number; height?: number; bytes?: number; mimeType?: string; durationMs?: number }) => void;
    removeTask: (id: string) => void;
    clearCompletedTasks: () => void;
    getActiveTask: () => GenerationTask | undefined;
};

export const useGenerationStore = create<GenerationStore>((set, get) => ({
    tasks: [],
    historyRevision: 0,

    addTask: (task) => {
        if (get().tasks.some((item) => item.id === task.id && (item.status === "pending" || item.status === "running"))) return false;
        set((state) => ({
            tasks: [task, ...state.tasks.filter((item) => item.id !== task.id)],
        }));
        return true;
    },

    updateTask: (id, patch) => {
        set((state) => ({
            tasks: state.tasks.map((task) => {
                if (task.id !== id) return task;
                const updated = { ...task, ...patch };
                // 自动计算成功和失败数量
                if (patch.images) {
                    updated.successCount = patch.images.filter((img) => img.status === "success").length;
                    updated.failCount = patch.images.filter((img) => img.status === "failed").length;
                }
                return updated;
            }),
        }));
    },

    updateTaskImage: (taskId, imageId, patch) => {
        set((state) => ({
            tasks: state.tasks.map((task) => {
                if (task.id !== taskId) return task;
                const updatedImages = task.images.map((img) => (img.id === imageId ? { ...img, ...patch } : img));
                const successCount = updatedImages.filter((img) => img.status === "success").length;
                const failCount = updatedImages.filter((img) => img.status === "failed").length;
                return {
                    ...task,
                    images: updatedImages,
                    successCount,
                    failCount,
                };
            }),
        }));
    },

    removeTask: (id) => {
        set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id),
            historyRevision: state.historyRevision + 1,
        }));
    },

    clearCompletedTasks: () => {
        set((state) => ({
            tasks: state.tasks.filter((task) => task.status === "pending" || task.status === "running"),
        }));
    },

    getActiveTask: () => {
        return get().tasks.find((task) => task.status === "pending" || task.status === "running");
    },
}));
