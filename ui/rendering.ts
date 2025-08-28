

import { appState, Sprite } from "../state.js";
import { domElements } from "./dom.js";

declare var Blockly: any;

export function applyEdgeWrap(sprite: Sprite) {
    const stageHalfWidth = 240;
    const stageHalfHeight = 180;
    let wrapped = false;

    if (sprite.state.x > stageHalfWidth) {
        sprite.state.x = -stageHalfWidth;
        wrapped = true;
    } else if (sprite.state.x < -stageHalfWidth) {
        sprite.state.x = stageHalfWidth;
        wrapped = true;
    }

    if (sprite.state.y > stageHalfHeight) {
        sprite.state.y = -stageHalfHeight;
        wrapped = true;
    } else if (sprite.state.y < -stageHalfHeight) {
        sprite.state.y = stageHalfHeight;
        wrapped = true;
    }

    if (wrapped) {
        sprite._isWrapping = true;
        sprite.isDirty = true;
    }
};

export function updateSpriteAppearance(sprite: Sprite) {
    if (sprite._isWrapping) {
        sprite.domElement.style.transition = 'none';
    }

    if (sprite.state.visible) {
        sprite.domElement.classList.remove('hidden');
    } else {
        sprite.domElement.classList.add('hidden');
        sprite.speechBubbleElement.classList.add('hidden');
    }

    const leftPercent = ((sprite.state.x + 240) / 480) * 100;
    const topPercent = ((-sprite.state.y + 180) / 360) * 100;
    sprite.domElement.style.left = `${leftPercent}%`;
    sprite.domElement.style.top = `${topPercent}%`;

    const scale = sprite.state.size / 100;
    let finalTransform = `translate(-50%, -50%)`;

    switch (sprite.state.rotationStyle) {
        case 'left-right':
            const normalizedAngle = ((sprite.state.angle % 360) + 360) % 360;
            if (normalizedAngle > 180) {
                finalTransform += ` scaleX(-1)`;
            }
            break;
        case 'none':
            break;
        case 'all-around':
        default:
            finalTransform += ` rotate(${sprite.state.angle - 90}deg)`;
            break;
    }

    finalTransform += ` scale(${scale})`;
    sprite.domElement.style.transform = finalTransform;
    
    const isDragging = sprite.domElement.classList.contains('dragging');
    let filterValue = `hue-rotate(${sprite.state.hue}deg)`;
    
    // New: Apply selection glow using drop-shadow for a tight fit
    // The glow is now based on stage selection, not just the active editor sprite.
    if (sprite.id === appState.stageSelectedSpriteId && !document.body.classList.contains('script-running')) {
        const outlineColor = '#4285F4'; // Corresponds to --blue var
        const thickness = scale > 0 ? 1.5 / scale : 0;
        filterValue += ` drop-shadow(${thickness}px 0 0 ${outlineColor})`;
        filterValue += ` drop-shadow(-${thickness}px 0 0 ${outlineColor})`;
        filterValue += ` drop-shadow(0 ${thickness}px 0 ${outlineColor})`;
        filterValue += ` drop-shadow(0 -${thickness}px 0 ${outlineColor})`;
    }

    if (isDragging) {
        filterValue += ' drop-shadow(0 4px 8px rgba(0,0,0,0.3))';
    }
    sprite.domElement.style.filter = filterValue;

    // The old outline logic is now obsolete. The `.selected-on-stage` class is now just a marker.
    // CSS rules for outline have been removed.

    if (sprite._isWrapping) {
        void sprite.domElement.offsetHeight; 
        sprite.domElement.style.transition = '';
        delete sprite._isWrapping;
    }

    updateSpeechBubblePosition(sprite);
}

export const updateSpeechBubblePosition = (sprite: Sprite) => {
    if (!sprite.speechBubbleElement.classList.contains('hidden')) {
        const spriteRect = sprite.domElement.getBoundingClientRect();
        const stageRect = domElements.stageElement.getBoundingClientRect();
        sprite.speechBubbleElement.style.left = `${spriteRect.left - stageRect.left + spriteRect.width / 2}px`;
        sprite.speechBubbleElement.style.top = `${spriteRect.top - stageRect.top}px`;
    }
};

export function updateMoveBlockIcon(workspace: any) {
    if (!workspace) return;

    const ICON_LEFT = 'https://codejredu.github.io/test/assets/blocklyicon/walk.svg';
    const ICON_RIGHT = 'https://codejredu.github.io/test/assets/blocklyicon/walk1.svg';

    const activeSprite = appState.activeSpriteId ? appState.sprites[appState.activeSpriteId] : null;

    let currentIcon = ICON_RIGHT;

    if (activeSprite && activeSprite.state.rotationStyle === 'left-right') {
        const normalizedAngle = ((activeSprite.state.angle % 360) + 360) % 360;
        if (normalizedAngle > 180) { 
            currentIcon = ICON_LEFT;
        }
    }

    const blocks = workspace.getBlocksByType('motion_movesteps', true);
    blocks.forEach((block: any) => {
        const iconField = block.getField('ICON');
        if (iconField && iconField.getValue() !== currentIcon) {
            iconField.setValue(currentIcon);
        }
    });
}

export function renderSpriteGifFrame(sprite: Sprite) {
    if (!sprite.isGif || !sprite.gifData || sprite.gifData.frames.length === 0) return;

    const { gifData } = sprite;
    const { frames, currentFrameIndex, ctx, fullFrameCtx, patchCanvas, patchCtx } = gifData;
    const frame = frames[currentFrameIndex];

    if (!ctx || !fullFrameCtx || !patchCtx || !frame || !frame.patch) return;

    const { width, height } = gifData;
    
    const prevFrame = frames[(currentFrameIndex + frames.length - 1) % frames.length];
    if (prevFrame) {
         if (prevFrame.disposalType === 3 && gifData.previousImageData) {
            fullFrameCtx.putImageData(gifData.previousImageData, 0, 0);
        } else if (prevFrame.disposalType === 2) {
            const { left, top, width: w, height: h } = prevFrame.dims;
            fullFrameCtx.clearRect(left, top, w, h);
        }
    }

    if (frame.disposalType === 3) {
        gifData.previousImageData = fullFrameCtx.getImageData(0, 0, width, height);
    } else {
        gifData.previousImageData = null;
    }

    const { left, top, width: patchWidth, height: patchHeight } = frame.dims;
    patchCanvas.width = patchWidth;
    patchCanvas.height = patchHeight;

    const patchImageData = new ImageData(new Uint8ClampedArray(frame.patch), patchWidth, patchHeight);
    patchCtx.putImageData(patchImageData, 0, 0);
    fullFrameCtx.drawImage(patchCanvas, left, top);

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(fullFrameCtx.canvas, 0, 0);
}

export function updateGifFrame(sprite: Sprite, deltaTime: number) {
    if (!sprite.isGif || !sprite.gifData || sprite.gifData.frames.length === 0 || !sprite.state.visible) {
        return;
    }

    const { gifData, state } = sprite;
    gifData.accumulator += deltaTime;

    const currentFrame = gifData.frames[gifData.currentFrameIndex];
    const frameDelay = (currentFrame.delay > 10 ? currentFrame.delay : 100) / state.animationSpeed;

    if (gifData.accumulator >= frameDelay) {
        gifData.accumulator -= frameDelay;
        gifData.currentFrameIndex = (gifData.currentFrameIndex + 1) % gifData.frames.length;
        renderSpriteGifFrame(sprite);
    }
}