

import { appState } from "../state.js";
import { domElements } from "./dom.js";
import { updatePropertiesPanel } from "./panels.js";
import { updateMoveBlockIcon } from "./rendering.js";
import { setStageSelection, switchSprite } from "./spriteManager.js";
import { handleSpriteClick } from "../runtime/engine.js";

declare var Blockly: any;

// --- Sprite Drag Handlers ---

export function handleSpriteMouseDown(e: MouseEvent, spriteId: string) {
    e.preventDefault();
    setStageSelection(spriteId); // Set this as the actively selected sprite on the stage for visual feedback.
    
    if (appState.activeSpriteId !== spriteId) {
        switchSprite(spriteId);
    }
    const sprite = appState.sprites[spriteId];
    sprite.domElement.classList.add('dragging');
    sprite.isDirty = true;
    appState.isDraggingSprite = true;
    appState.draggingInfo = { spriteId, startX: e.clientX, startY: e.clientY, spriteStartX: sprite.state.x, spriteStartY: sprite.state.y, moved: false };
    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);
}

function handleDocumentMouseMove(e: MouseEvent) {
    if (!appState.draggingInfo.spriteId) return;
    const sprite = appState.sprites[appState.draggingInfo.spriteId];
    const dx = e.clientX - appState.draggingInfo.startX;
    const dy = e.clientY - appState.draggingInfo.startY;

    if (!appState.draggingInfo.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        appState.draggingInfo.moved = true;
    }

    const stageRect = domElements.stageElement.getBoundingClientRect();
    const scale = 480 / stageRect.width;
    
    const newX = appState.draggingInfo.spriteStartX + dx * scale;
    const newY = appState.draggingInfo.spriteStartY - dy * scale;

    const logicalHalfWidth = 240;
    const logicalHalfHeight = 180;
    sprite.state.x = Math.max(-logicalHalfWidth, Math.min(logicalHalfWidth, newX));
    sprite.state.y = Math.max(-logicalHalfHeight, Math.min(logicalHalfHeight, newY));

    sprite.isDirty = true;
    updatePropertiesPanel();
}

function handleDocumentMouseUp() {
    if (!appState.draggingInfo.spriteId) return;
    if (!appState.draggingInfo.moved) {
        handleSpriteClick(appState.draggingInfo.spriteId);
    }
    const sprite = appState.sprites[appState.draggingInfo.spriteId];
    sprite.domElement.classList.remove('dragging');
    sprite.isDirty = true;
    appState.isDraggingSprite = false;
    appState.draggingInfo = { spriteId: null, startX: 0, startY: 0, spriteStartX: 0, spriteStartY: 0, moved: false };
    document.removeEventListener('mousemove', handleDocumentMouseMove);
    document.removeEventListener('mouseup', handleDocumentMouseUp);
}

// --- Properties Panel Direction Dial Handlers ---

function calculateAngleFromMouseEvent(e: MouseEvent, dialElement: HTMLElement): number {
    const dialRect = dialElement.getBoundingClientRect();
    const centerX = dialRect.left + dialRect.width / 2;
    const centerY = dialRect.top + dialRect.height / 2;
    const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    let angleDeg = angleRad * (180 / Math.PI);
    angleDeg += 90; // Adjust for Scratch's coordinate system (0 is up)
    if (angleDeg < 0) angleDeg += 360;
    return Math.round(angleDeg);
}

export function handleDirectionDialMouseDown(e: MouseEvent) {
    if (appState.isRunning) return;
    e.preventDefault();
    appState.isDialDragging = true;
    domElements.directionDial.classList.add('dragging');
    document.addEventListener('mousemove', handleDirectionDialMouseMove);
    document.addEventListener('mouseup', handleDirectionDialMouseUp);
    handleDirectionDialMouseMove(e);
}

function handleDirectionDialMouseMove(e: MouseEvent) {
    if (!appState.isDialDragging || !appState.activeSpriteId) return;
    const roundedAngle = calculateAngleFromMouseEvent(e, domElements.directionDial);
    const sprite = appState.sprites[appState.activeSpriteId];
    sprite.state.angle = roundedAngle;
    sprite.isDirty = true;
    updatePropertiesPanel();
    updateMoveBlockIcon(Blockly.getMainWorkspace());
}

function handleDirectionDialMouseUp() {
    appState.isDialDragging = false;
    domElements.directionDial.classList.remove('dragging');
    document.removeEventListener('mousemove', handleDirectionDialMouseMove);
    document.removeEventListener('mouseup', handleDirectionDialMouseUp);
}