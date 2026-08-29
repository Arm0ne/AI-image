const activeRequests = new Map<AbortController, number>();

export function registerAiRequest(controller: AbortController) {
    activeRequests.set(controller, (activeRequests.get(controller) || 0) + 1);
    return () => {
        const count = activeRequests.get(controller);
        if (!count) return;
        if (count === 1) activeRequests.delete(controller);
        else activeRequests.set(controller, count - 1);
    };
}

export function cancelAiRequests() {
    activeRequests.forEach((_, controller) => controller.abort());
    activeRequests.clear();
}
