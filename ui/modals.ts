

import { decompressFrames, parseGIF } from "../lib/gifuct-js.js";
import { appState } from "../state.js";
import { domElements } from "./dom.js";

function resetGifEditor() {
    const { gifEditorState } = appState;
    if (gifEditorState.animationTimeoutId) clearTimeout(gifEditorState.animationTimeoutId);
    Object.assign(gifEditorState, {
        frames: [],
        isPlaying: false,
        currentFrameIndex: 0,
        animationTimeoutId: null,
        fullFrame: null,
        previousImageData: null,
        backgroundColor: null,
    });
    const ctx = domElements.gifPreviewCanvas.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, domElements.gifPreviewCanvas.width, domElements.gifPreviewCanvas.height);
    }
}

function loadGifIntoEditor(buffer: ArrayBuffer) {
    try {
        const { gifEditorState } = appState;
        const parsedGif = parseGIF(buffer);
        
        const gct = parsedGif.gct;
        const bgIndex = parsedGif.lsd.backgroundColorIndex;
        if (gct && bgIndex < gct.length) {
            const bgColorRgb = gct[bgIndex];
            gifEditorState.backgroundColor = `rgb(${bgColorRgb[0]}, ${bgColorRgb[1]}, ${bgColorRgb[2]})`;
        } else {
            gifEditorState.backgroundColor = null;
        }

        gifEditorState.frames = decompressFrames(parsedGif, false);

        if (gifEditorState.frames.length > 0) {
            setupGifEditorUIForPlayback();
            startGifEditorAnimation();
        } else {
            throw new Error("לא נמצאו פריימים בקובץ ה-GIF.");
        }
    } catch (error) {
        console.error("Error processing GIF:", error);
        alert(`שגיאה בפענוח קובץ ה-GIF: ${error instanceof Error ? error.message : String(error)}`);
        closeGifEditorModal();
    }
}

function setupGifEditorUIForPlayback() {
    domElements.gifEditorSpinner.classList.add('hidden');
    domElements.gifPreviewCanvas.classList.remove('hidden');

    const { gifEditorState } = appState;
    const { width, height } = gifEditorState.frames[0].dims;
    const RENDER_SCALE = 2;
    domElements.gifPreviewCanvas.width = width * RENDER_SCALE;
    domElements.gifPreviewCanvas.height = height * RENDER_SCALE;
    domElements.gifPreviewCanvas.style.backgroundColor = gifEditorState.backgroundColor || 'transparent';
}

function startGifEditorAnimation() {
    const { gifEditorState } = appState;
    if (gifEditorState.isPlaying || gifEditorState.frames.length === 0) return;
    gifEditorState.isPlaying = true;
    animateGifEditor();
}

function animateGifEditor() {
    const { gifEditorState } = appState;
    if (!gifEditorState.isPlaying) return;

    gifEditorState.currentFrameIndex = (gifEditorState.currentFrameIndex + 1) % gifEditorState.frames.length;
    renderGifEditorFrame();

    const frame = gifEditorState.frames[gifEditorState.currentFrameIndex];
    if (!frame) {
        gifEditorState.isPlaying = false;
        return;
    }
    
    const speedMultiplier = parseFloat(domElements.gifSpeedSlider.value);
    const frameDelay = frame.delay > 10 ? frame.delay : 100;
    const delay = frameDelay / speedMultiplier;

    gifEditorState.animationTimeoutId = window.setTimeout(animateGifEditor, delay);
}

function renderGifEditorFrame() {
    const { gifEditorState } = appState;
    const frame = gifEditorState.frames[gifEditorState.currentFrameIndex];
    const previewCtx = domElements.gifPreviewCanvas.getContext('2d');
    if (!previewCtx || !gifEditorState.patchCtx || !frame || !frame.patch) return;

    const RENDER_SCALE = 2;

    if (!gifEditorState.fullFrame) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = domElements.gifPreviewCanvas.width;
        tempCanvas.height = domElements.gifPreviewCanvas.height;
        gifEditorState.fullFrame = tempCanvas.getContext('2d', { willReadFrequently: true });
        if (!gifEditorState.fullFrame) return;
        gifEditorState.fullFrame.imageSmoothingEnabled = false;

        if (gifEditorState.backgroundColor) {
            gifEditorState.fullFrame.fillStyle = gifEditorState.backgroundColor;
            gifEditorState.fullFrame.fillRect(0, 0, domElements.gifPreviewCanvas.width, domElements.gifPreviewCanvas.height);
        }
    }
    
    const prevFrame = gifEditorState.frames[(gifEditorState.currentFrameIndex + gifEditorState.frames.length - 1) % gifEditorState.frames.length];

    if (prevFrame.disposalType === 3 && gifEditorState.previousImageData) {
        gifEditorState.fullFrame.putImageData(gifEditorState.previousImageData, 0, 0);
    } else if (prevFrame.disposalType === 2) {
        const { left, top, width, height } = prevFrame.dims;
        gifEditorState.fullFrame.clearRect(left * RENDER_SCALE, top * RENDER_SCALE, width * RENDER_SCALE, height * RENDER_SCALE);
    }

    if (frame.disposalType === 3) {
        gifEditorState.previousImageData = gifEditorState.fullFrame.getImageData(0, 0, domElements.gifPreviewCanvas.width, domElements.gifPreviewCanvas.height);
    } else {
        gifEditorState.previousImageData = null;
    }
    
    const { left, top, width, height } = frame.dims;
    gifEditorState.patchCanvas.width = width;
    gifEditorState.patchCanvas.height = height;
    
    const patchImageData = new ImageData(new Uint8ClampedArray(frame.patch), width, height);
    gifEditorState.patchCtx.putImageData(patchImageData, 0, 0);
    gifEditorState.fullFrame.drawImage(gifEditorState.patchCanvas, left * RENDER_SCALE, top * RENDER_SCALE, width * RENDER_SCALE, height * RENDER_SCALE);
    
    previewCtx.clearRect(0, 0, domElements.gifPreviewCanvas.width, domElements.gifPreviewCanvas.height);
    previewCtx.drawImage(gifEditorState.fullFrame.canvas, 0, 0);
}

export function openGifEditorModal(spriteId: string) {
    appState.editingAnimationSpriteId = spriteId;
    const sprite = appState.sprites[spriteId];
    if (!sprite) return;

    resetGifEditor();
    domElements.gifEditorModal.classList.remove('hidden');
    domElements.gifEditorSpinner.classList.remove('hidden');
    domElements.gifPreviewCanvas.classList.add('hidden');

    domElements.gifSpeedSlider.value = String(sprite.state.animationSpeed);
    domElements.gifSpeedValue.textContent = `${sprite.state.animationSpeed.toFixed(2)}x`;

    fetch(sprite.state.imageUrl)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.arrayBuffer();
        })
        .then(loadGifIntoEditor)
        .catch(error => {
            console.error('Error loading GIF for editor:', error);
            alert('לא ניתן לטעון את קובץ ה-GIF לעריכה.');
            closeGifEditorModal();
        });
}

export function closeGifEditorModal() {
    domElements.gifEditorModal.classList.add('hidden');
    resetGifEditor();
    appState.editingAnimationSpriteId = null;
}

export function initGifEditor() {
    domElements.closeGifEditorButton.addEventListener('click', closeGifEditorModal);
    domElements.gifEditorModal.addEventListener('click', (e) => { if (e.target === domElements.gifEditorModal) closeGifEditorModal(); });
    domElements.gifSpeedSlider.addEventListener('input', () => {
        if (!appState.editingAnimationSpriteId) return;
        const sprite = appState.sprites[appState.editingAnimationSpriteId];
        if (!sprite) return;
    
        const speed = parseFloat(domElements.gifSpeedSlider.value);
        sprite.state.animationSpeed = speed;
        domElements.gifSpeedValue.textContent = `${speed.toFixed(2)}x`;
    });
}