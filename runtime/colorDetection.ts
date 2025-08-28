

let detectionCanvas: HTMLCanvasElement;
export let detectionCtx: CanvasRenderingContext2D | null;
let isCanvasReady = false;

export const getDetectionContext = () => detectionCtx;

export function initDetectionCanvas() {
    detectionCanvas = document.createElement('canvas');
    detectionCanvas.width = 480;
    detectionCanvas.height = 360;
    detectionCtx = detectionCanvas.getContext('2d', { willReadFrequently: true });
    if (detectionCtx) {
        // Ensure it's not blurry for pixel-perfect sampling
        detectionCtx.imageSmoothingEnabled = false;
    }
}

export function updateDetectionCanvas(imageUrl: string): Promise<void> {
    isCanvasReady = false;
    if (!detectionCtx) return Promise.reject("Detection canvas not initialized.");
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            detectionCtx!.clearRect(0, 0, 480, 360);
            detectionCtx!.drawImage(img, 0, 0, 480, 360);
            isCanvasReady = true;
            resolve();
        };
        img.onerror = () => {
            // Also clear on error to prevent using stale data
            detectionCtx!.clearRect(0, 0, 480, 360);
            reject(new Error(`Failed to load image for color detection: ${imageUrl}`));
        };
        img.src = imageUrl;
    });
}

export function getColorAt(x: number, y: number): [number, number, number] | null {
    if (!detectionCtx || !isCanvasReady) return null;

    // Convert from Scratch coords (-240 to 240, -180 to 180) to canvas coords (0-480, 0-360)
    const canvasX = Math.round(x + 240);
    const canvasY = Math.round(-y + 180);

    if (canvasX < 0 || canvasX >= 480 || canvasY < 0 || canvasY >= 360) {
        return null; // Out of bounds
    }

    const pixel = detectionCtx.getImageData(canvasX, canvasY, 1, 1).data;
    // Ignore alpha channel (pixel[3])
    return [pixel[0], pixel[1], pixel[2]];
}