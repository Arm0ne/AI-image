import { create } from "zustand";
import { nanoid } from "nanoid";

export type GenerationTaskStatus = "pending" | "running" | "completed" | "success" | "failed";

export type GenerationTask = {
    id: string;
    prompt: string;
    model: string;
    count: number;
    status: GenerationTaskStatus;
    createdAt: number;
    completedAt?: number;
    successCount: number;
    failCount: number;
    images: Array<{
        id: string;
        dataUrl: string;
        storageKey?: string;
        status: "pending" | "success" | "failed";
        error?: string;
    }>;
};

type GenerationStore = {
    tasks: GenerationTask[];
    addTask: (task: Omit<GenerationTask, "id" | "createdAt" | "successCount" | "failCount">) => string;
    updateTask: (id: string, patch: Partial<Omit<GenerationTask, "id" | "createdAt">>) => void;
    updateTaskImage: (taskId: string, imageId: string, patch: { status?: "pending" | "success" | "failed"; dataUrl?: string; storageKey?: string; error?: string }) => void;
    removeTask: (id: string) => void;
    clearCompletedTasks: () => void;
    getActiveTask: () => GenerationTask | undefined;
};

export const useGenerationStore = create<GenerationStore>((set, get) => ({
    tasks: [],

    addTask: (task) => {
        const id = nanoid();
        const newTask: GenerationTask = {
            ...task,
            id,
            createdAt: Date.now(),
            successCount: 0,
            failCount: 0,
        };
        set((state) => ({
            tasks: [newTask, ...state.tasks],
        }));
        return id;
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
                const allCompleted = updatedImages.every((img) => img.status === "success" || img.status === "failed");
                return {
                    ...task,
                    images: updatedImages,
                    successCount,
                    failCount,
                    status: allCompleted ? (successCount > 0 ? "success" : "failed") : task.status,
                    completedAt: allCompleted ? Date.now() : task.completedAt,
                };
            }),
        }));
    },

    removeTask: (id) => {
        set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id),
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
