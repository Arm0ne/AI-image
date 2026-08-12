export async function prepareImageForDownload(
    dataUrl: string,
    format: "original" | "webp",
): Promise<{ dataUrl: string; extension: string }> {
    if (format === "original") {
        const extension = getImageExtension(dataUrl);
        return { dataUrl, extension };
    }

    return convertToWebP(dataUrl);
}

function getImageExtension(dataUrl: string): string {
    const match = dataUrl.match(/^data:image\/(\w+);base64,/);
    if (!match) return "png";
    const mimeType = match[1].toLowerCase();
    if (mimeType === "jpeg" || mimeType === "jpg") return "jpg";
    if (mimeType === "png") return "png";
    if (mimeType === "webp") return "webp";
    if (mimeType === "gif") return "gif";
    return "png";
}

async function convertToWebP(dataUrl: string): Promise<{ dataUrl: string; extension: string }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Failed to get canvas context"));
                return;
            }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error("Failed to convert image to WebP"));
                        return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve({ dataUrl: reader.result as string, extension: "webp" });
                    };
                    reader.onerror = () => reject(new Error("Failed to read WebP blob"));
                    reader.readAsDataURL(blob);
                },
                "image/webp",
                0.95,
            );
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = dataUrl;
    });
}
