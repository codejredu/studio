
import { appState } from "../state.js";
import { domElements } from "./dom.js";

declare var Blockly: any;

// --- State for Direction Editor ---
let isDirectionEditorDialDragging = false;
let directionEditorValue = 0;

// --- Number Pad Logic ---
export function openNumberPad(field: any) {
    appState.activeField = field;
    appState.currentNumberPadValue = field.getText();
    domElements.numberPadDisplay.textContent = appState.currentNumberPadValue || '0';

    const fieldRect = field.getClickTarget_().getBoundingClientRect();
    domElements.numberPadModal.style.top = `${fieldRect.bottom + 5}px`;
    domElements.numberPadModal.style.left = `${fieldRect.left}px`;
    
    domElements.numberPadModal.classList.remove('hidden');
    domElements.numpadBackdrop.classList.remove('hidden');
}

function closeNumberPad(applyValue: boolean) {
    if (applyValue && appState.activeField) {
        appState.activeField.setValue(appState.currentNumberPadValue);
    }
    domElements.numberPadModal.classList.add('hidden');
    domElements.numpadBackdrop.classList.add('hidden');
    appState.activeField = null;
}

function handleNumberPadGridClick(e: Event) {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('num-pad-btn')) return;

    const value = target.dataset.value;
    if (appState.currentNumberPadValue === '0' && value !== '.') {
        appState.currentNumberPadValue = '';
    }
    if (value === '.') {
        if (!appState.currentNumberPadValue.includes('.')) {
            appState.currentNumberPadValue += '.';
        }
    } else if (value !== undefined) {
        appState.currentNumberPadValue += value;
    }
    domElements.numberPadDisplay.textContent = appState.currentNumberPadValue;
}

function handleNumPadBackspace() {
    if (appState.currentNumberPadValue.length > 1) {
        appState.currentNumberPadValue = appState.currentNumberPadValue.slice(0, -1);
    } else {
        appState.currentNumberPadValue = '0';
    }
    domElements.numberPadDisplay.textContent = appState.currentNumberPadValue;
}

function handleNumPadClear() {
    appState.currentNumberPadValue = '0';
    domElements.numberPadDisplay.textContent = appState.currentNumberPadValue;
}

function handleNumPadSign() {
    if (appState.currentNumberPadValue !== '0' && appState.currentNumberPadValue !== '') {
        if (appState.currentNumberPadValue.startsWith('-')) {
            appState.currentNumberPadValue = appState.currentNumberPadValue.substring(1);
        } else {
            appState.currentNumberPadValue = '-' + appState.currentNumberPadValue;
        }
        domElements.numberPadDisplay.textContent = appState.currentNumberPadValue;
    }
}


// --- Direction Editor Popover Logic ---
export function openDirectionPad(field: any) {
    appState.activeField = field;
    const initialValue = parseInt(field.getText(), 10);
    directionEditorValue = isNaN(initialValue) ? 90 : initialValue;
    updateDirectionEditorUI();

    const fieldRect = field.getClickTarget_().getBoundingClientRect();
    domElements.directionEditorPopover.style.top = `${fieldRect.bottom + 5}px`;
    domElements.directionEditorPopover.style.left = `${fieldRect.left}px`;
    
    domElements.directionEditorPopover.classList.remove('hidden');
    domElements.directionEditorBackdrop.classList.remove('hidden');
}

function closeDirectionEditor(applyValue: boolean) {
    if (applyValue && appState.activeField) {
        appState.activeField.setValue(directionEditorValue);
    }
    domElements.directionEditorPopover.classList.add('hidden');
    domElements.directionEditorBackdrop.classList.add('hidden');
    appState.activeField = null;
    isDirectionEditorDialDragging = false; 
    document.removeEventListener('mousemove', handleDirectionEditorDialMouseMove);
    document.removeEventListener('mouseup', handleDirectionEditorDialMouseUp);
}

function updateDirectionEditorUI() {
    domElements.directionEditorDisplay.textContent = String(directionEditorValue);
    domElements.directionEditorDialHandle.style.transform = `rotate(${directionEditorValue}deg)`;
}

function setDirectionEditorValue(newValue: number) {
    directionEditorValue = (Math.round(newValue) % 360 + 360) % 360;
    updateDirectionEditorUI();
}

function calculateAngleForDirectionEditor(e: MouseEvent): number {
    const dialRect = domElements.directionEditorDial.getBoundingClientRect();
    const centerX = dialRect.left + dialRect.width / 2;
    const centerY = dialRect.top + dialRect.height / 2;
    const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    let angleDeg = angleRad * (180 / Math.PI);
    angleDeg += 90;
    if (angleDeg < 0) angleDeg += 360;
    return angleDeg;
}

function handleDirectionEditorDialMouseDown(e: MouseEvent) {
    e.preventDefault();
    isDirectionEditorDialDragging = true;
    domElements.directionEditorDial.classList.add('dragging');
    document.addEventListener('mousemove', handleDirectionEditorDialMouseMove);
    document.addEventListener('mouseup', handleDirectionEditorDialMouseUp);
    setDirectionEditorValue(calculateAngleForDirectionEditor(e));
}

function handleDirectionEditorDialMouseMove(e: MouseEvent) {
    if (!isDirectionEditorDialDragging) return;
    setDirectionEditorValue(calculateAngleForDirectionEditor(e));
}

function handleDirectionEditorDialMouseUp() {
    isDirectionEditorDialDragging = false;
    domElements.directionEditorDial.classList.remove('dragging');
    document.removeEventListener('mousemove', handleDirectionEditorDialMouseMove);
    document.removeEventListener('mouseup', handleDirectionEditorDialMouseUp);
}

export function initInputPads() {
    // Number Pad Listeners
    domElements.numberPadGrid.addEventListener('click', handleNumberPadGridClick);
    domElements.numPadBackspaceButton.addEventListener('click', handleNumPadBackspace);
    domElements.numPadClearButton.addEventListener('click', handleNumPadClear);
    domElements.numPadSignButton.addEventListener('click', handleNumPadSign);
    domElements.numPadOkButton.addEventListener('click', () => closeNumberPad(true));
    domElements.numpadBackdrop.addEventListener('click', () => closeNumberPad(false));
    
    // Direction Editor Listeners
    domElements.directionEditorBackdrop.addEventListener('click', () => closeDirectionEditor(false));
    domElements.directionEditorOkButton.addEventListener('click', () => closeDirectionEditor(true));
    domElements.directionEditorDial.addEventListener('mousedown', handleDirectionEditorDialMouseDown);
    domElements.directionEditorUpButton.addEventListener('click', () => setDirectionEditorValue(directionEditorValue + 1));
    domElements.directionEditorDownButton.addEventListener('click', () => setDirectionEditorValue(directionEditorValue - 1));
}