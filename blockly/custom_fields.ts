

import { appState } from "../state.js";
import { openNumberPad, openDirectionPad } from "../ui/inputPads.js";
import { domElements } from "../ui/dom.js";
import { getColorAt, getDetectionContext } from "../runtime/colorDetection.js";

declare var Blockly: any;

// --- Custom Number Field for Number Pad ---
export class CustomFieldNumber extends Blockly.FieldNumber {
    showEditor_() {
        openNumberPad(this);
    }
}

// --- Custom Angle Field for Direction Dial ---
export class CustomFieldAngle extends Blockly.FieldNumber {
    showEditor_() {
        // Open the dedicated direction editor modal instead of the generic number pad.
        openDirectionPad(this);
    }
}

// --- Interactive Color Picker Field ---

const PALETTE_COLORS = [
    // Row 1: Greyscale
    '#ffffff', '#f2f2f2', '#d9d9d9', '#bfbfbf', '#a6a6a6', '#8c8c8c', '#595959', '#404040', '#262626', '#000000',
    // Row 2: Reds & Pinks
    '#fce4ec', '#f8bbd0', '#f48fb1', '#f06292', '#ec407a', '#e91e63', '#d81b60', '#c2185b', '#ad1457', '#880e4f',
    // Row 3: Oranges
    '#fff3e0', '#ffe0b2', '#ffcc80', '#ffb74d', '#ffa726', '#ff9800', '#fb8c00', '#f57c00', '#ef6c00', '#e65100',
    // Row 4: Yellows & Limes
    '#fefce8', '#fff9c4', '#fff59d', '#fff176', '#ffee58', '#fdd835', '#d4e157', '#cddc39', '#afb42b', '#827717',
    // Row 5: Greens
    '#e8f5e9', '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a', '#4caf50', '#43a047', '#388e3c', '#2e7d32', '#1b5e20',
    // Row 6: Cyans & Blues
    '#e0f7fa', '#b2ebf2', '#80deea', '#4dd0e1', '#26c6da', '#00bcd4', '#00acc1', '#0097a7', '#03a9f4', '#0288d1',
    // Row 7: Blues & Purples
    '#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196f3', '#7e57c2', '#673ab7', '#5e35b1', '#512da8',
];


// Module-level state for the color picker UI
let activeFieldForPalette: any = null;
let activeEyedropperField: any = null;
let magnifierCanvas: HTMLCanvasElement | null = null;
let magnifierCtx: CanvasRenderingContext2D | null = null;
const MAGNIFIER_SIZE = 120; // The CSS size of the magnifier div
const ZOOM_LEVEL = 10;
const PIXEL_AREA_SIZE = MAGNIFIER_SIZE / ZOOM_LEVEL;

// --- Palette Logic ---
function closeColorPalette() {
    if (!activeFieldForPalette) return;
    domElements.colorPalettePopover.classList.add('hidden');
    domElements.colorPaletteBackdrop.classList.add('hidden');
    activeFieldForPalette = null;
}

function openColorPalette(field: any) {
    if (activeFieldForPalette) {
        closeColorPalette();
        return;
    }
    activeFieldForPalette = field;

    // 1. Populate grid if it's empty
    const grid = domElements.colorPaletteGrid;
    if (grid.childElementCount === 0) {
        PALETTE_COLORS.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color;
            grid.appendChild(swatch);
        });
    }

    // 2. Setup one-time listeners
    grid.onclick = (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('color-swatch')) {
            const color = target.dataset.color;
            if (color && activeFieldForPalette) {
                activeFieldForPalette.setValue(color);
            }
            closeColorPalette();
        }
    };

    domElements.colorPaletteEyedropper.onclick = () => {
        const fieldToUse = activeFieldForPalette;
        closeColorPalette();
        startColorPicking(fieldToUse);
    };

    domElements.colorPaletteBackdrop.onclick = () => closeColorPalette();

    // 3. Position and show popover
    const fieldRect = field.getClickTarget_().getBoundingClientRect();
    const popover = domElements.colorPalettePopover;
    popover.classList.remove('hidden');
    
    // Defer positioning to next tick to allow popover to render and get its dimensions
    setTimeout(() => {
        const popoverRect = popover.getBoundingClientRect();
        let top = fieldRect.bottom + 12;
        let left = fieldRect.left + (fieldRect.width / 2) - (popoverRect.width / 2);

        if (left < 5) left = 5;
        if (left + popoverRect.width > window.innerWidth) left = window.innerWidth - popoverRect.width - 5;
        
        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;
    }, 0);
    
    domElements.colorPaletteBackdrop.classList.remove('hidden');
}


// --- Eyedropper (Magnifier) Logic ---

function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function stopColorPicking() {
    if (!activeEyedropperField) return;
    domElements.colorPickerOverlay.classList.add('hidden');
    domElements.colorPickerMagnifier.classList.add('hidden');
    domElements.colorPickerOverlay.removeEventListener('mousemove', handleColorPickerMouseMove);
    domElements.colorPickerOverlay.removeEventListener('click', handleColorPickerClick);
    domElements.colorPickerOverlay.removeEventListener('mouseleave', stopColorPicking);
    activeEyedropperField = null;
}

function handleColorPickerMouseMove(e: MouseEvent) {
    if (!magnifierCtx) return;

    const stageRect = domElements.stageElement.getBoundingClientRect();
    const detectionCtx = getDetectionContext();
    if (!detectionCtx) return;

    const x = e.clientX - stageRect.left;
    const y = e.clientY - stageRect.top;

    domElements.colorPickerMagnifier.style.left = `${e.clientX - MAGNIFIER_SIZE / 2}px`;
    domElements.colorPickerMagnifier.style.top = `${e.clientY - MAGNIFIER_SIZE / 2}px`;

    const canvasX = (x / stageRect.width) * 480;
    const canvasY = (y / stageRect.height) * 360;

    const sx = Math.max(0, Math.min(canvasX - PIXEL_AREA_SIZE / 2, 480 - PIXEL_AREA_SIZE));
    const sy = Math.max(0, Math.min(canvasY - PIXEL_AREA_SIZE / 2, 360 - PIXEL_AREA_SIZE));

    magnifierCtx.fillStyle = '#FFF';
    magnifierCtx.fillRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);
    magnifierCtx.drawImage(
        detectionCtx.canvas,
        sx, sy, PIXEL_AREA_SIZE, PIXEL_AREA_SIZE,
        0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE
    );
    
    const centerX = MAGNIFIER_SIZE / 2;
    const centerY = MAGNIFIER_SIZE / 2;
    const pixelBoxSize = ZOOM_LEVEL;
    magnifierCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    magnifierCtx.lineWidth = 2;
    magnifierCtx.strokeRect(centerX - pixelBoxSize / 2, centerY - pixelBoxSize / 2, pixelBoxSize, pixelBoxSize);
    magnifierCtx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    magnifierCtx.lineWidth = 1;
    magnifierCtx.strokeRect(centerX - pixelBoxSize / 2, centerY - pixelBoxSize / 2, pixelBoxSize, pixelBoxSize);
    
    const stageX = (x / stageRect.width) * 480 - 240;
    const stageY = -((y / stageRect.height) * 360 - 180);
    const color = getColorAt(stageX, stageY);
    if(color && activeEyedropperField){
        const hex = rgbToHex(color[0], color[1], color[2]);
        activeEyedropperField.setValue(hex, true);
    }
}

function handleColorPickerClick(e: MouseEvent) {
    const stageRect = domElements.stageElement.getBoundingClientRect();
    const x = e.clientX - stageRect.left;
    const y = e.clientY - stageRect.top;
    const stageX = (x / stageRect.width) * 480 - 240;
    const stageY = -((y / stageRect.height) * 360 - 180);

    const color = getColorAt(stageX, stageY);
    if (color && activeEyedropperField) {
        const hex = rgbToHex(color[0], color[1], color[2]);
        activeEyedropperField.setValue(hex);
    }
    stopColorPicking();
}

function startColorPicking(field: any) {
    activeEyedropperField = field;
    domElements.colorPickerOverlay.classList.remove('hidden');
    domElements.colorPickerMagnifier.classList.remove('hidden');
    
    if (!magnifierCanvas) {
        magnifierCanvas = domElements.colorPickerMagnifier.querySelector('canvas') as HTMLCanvasElement;
        magnifierCtx = magnifierCanvas.getContext('2d');
        if (magnifierCtx) {
            magnifierCanvas.width = MAGNIFIER_SIZE;
            magnifierCanvas.height = MAGNIFIER_SIZE;
            magnifierCtx.imageSmoothingEnabled = false;
        }
    }
    
    domElements.colorPickerOverlay.addEventListener('mousemove', handleColorPickerMouseMove);
    domElements.colorPickerOverlay.addEventListener('click', handleColorPickerClick);
    domElements.colorPickerOverlay.addEventListener('mouseleave', stopColorPicking);
}

export class FieldColorPicker extends Blockly.Field {
    private colorElement_: SVGElement | null = null;
    SERIALIZABLE = true;

    constructor(value = '#ff0000') {
        super(value);
        this.CURSOR = 'pointer';
    }

    /**
     * @param {Object} options The JSON object to construct a new field from.
     * @returns {FieldColorPicker} The new field instance.
     * @package
     * @nocollapse
     */
    static fromJson(options: { [key: string]: any }): FieldColorPicker {
        return new FieldColorPicker(options['value']);
    }
    
    initView() {
        this.size_ = new Blockly.utils.Size(40, 20);
        
        this.colorElement_ = Blockly.utils.dom.createSvgElement('rect', {
            'rx': 4, 'ry': 4,
            'width': this.size_.width, 'height': this.size_.height,
            'stroke': '#BDBDBD',
            'stroke-width': '1'
        }, this.fieldGroup_);

        this.updateColor();
    }

    setValue(newValue: string, silent = false) {
        if (this.value_ === newValue) return;
        if (this.sourceBlock_ && Blockly.Events.isEnabled() && !silent) {
            // The modern way is to use the event constructor directly.
            // This replaces the deprecated `Blockly.Events.get(Blockly.Events.BLOCK_CHANGE)`.
            Blockly.Events.fire(new Blockly.Events.BlockChange(
                this.sourceBlock_, 'field', this.name, this.value_, newValue));
        }
        this.value_ = newValue;
        this.updateColor();
    }
    
    updateColor() {
        if (this.colorElement_) {
            // Apply fill color via inline style with !important to override conflicting CSS.
            this.colorElement_.setAttribute('style', `fill: ${this.getValue()} !important;`);
        }
    }
    
    showEditor_() {
        openColorPalette(this);
    }
}
