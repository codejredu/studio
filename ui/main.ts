

import { handleGenerateScript, initAiSpriteGenerator } from "../ai/scripting.js";
import { refreshSpriteDropdowns } from "../blockly/setup.js";
import { handleLoadProjectFile, handleSaveProject } from "../project/io.js";
import { execute, stopAllExecutions, handleKeyPress } from "../runtime/engine.js";
import { appState } from "../state.js";
import { initBackdropLibrary } from "./backdropManager.js";
import { domElements } from "./dom.js";
import { handleDirectionDialMouseDown } from "./dragDrop.js";
import { initInputPads } from "./inputPads.js";
import { initGifEditor } from "./modals.js";
import { updatePropertiesPanel } from "./panels.js";
import { initRecorder } from "./recorder.js";
import { updateMoveBlockIcon } from "./rendering.js";
import { initSoundLibrary } from "./soundManager.js";
import { initSpriteLibrary, setStageSelection } from "./spriteManager.js";

declare var Blockly: any;

function setupPropertyPanelListeners() {
    const setupSliderSync = (slider: HTMLInputElement, numInput: HTMLInputElement, callback: (val: number) => void) => {
        slider.addEventListener('input', () => {
            const val = parseInt(slider.value, 10);
            numInput.value = String(val);
            callback(val);
        });
        numInput.addEventListener('input', () => {
            const val = parseInt(numInput.value, 10);
            if (!isNaN(val)) {
                slider.value = String(val);
                callback(val);
            }
        });
    };

    domElements.spriteNameInput.addEventListener('input', () => {
        if (!appState.activeSpriteId) return;
        const sprite = appState.sprites[appState.activeSpriteId];
        const newName = domElements.spriteNameInput.value;
        sprite.name = newName;
    
        const spriteInfo = document.querySelector(`.sprite-info[data-id="${sprite.id}"]`);
        if (spriteInfo) {
            const nameSpan = spriteInfo.querySelector('span');
            if (nameSpan) {
                nameSpan.textContent = newName;
            }
        }
        refreshSpriteDropdowns(Blockly.getMainWorkspace());
    });
    
    setupSliderSync(domElements.spriteXSlider, domElements.spriteXNum, (val) => { if (!appState.activeSpriteId) return; const s = appState.sprites[appState.activeSpriteId]; s.state.x = val; s.isDirty = true; updatePropertiesPanel(); });
    setupSliderSync(domElements.spriteYSlider, domElements.spriteYNum, (val) => { if (!appState.activeSpriteId) return; const s = appState.sprites[appState.activeSpriteId]; s.state.y = val; s.isDirty = true; updatePropertiesPanel(); });
    setupSliderSync(domElements.spriteSizeSlider, domElements.spriteSizeNum, (val) => { if (!appState.activeSpriteId) return; appState.sprites[appState.activeSpriteId].state.size = val; appState.sprites[appState.activeSpriteId].isDirty = true; });
    setupSliderSync(domElements.spriteHueSlider, domElements.spriteHueNum, (val) => { if (!appState.activeSpriteId) return; appState.sprites[appState.activeSpriteId].state.hue = val; appState.sprites[appState.activeSpriteId].isDirty = true; });

    domElements.spriteDirectionNum.addEventListener('input', () => {
        if (!appState.activeSpriteId) return;
        const sprite = appState.sprites[appState.activeSpriteId];
        let angle = parseInt(domElements.spriteDirectionNum.value, 10);
        if (!isNaN(angle)) {
            sprite.state.angle = (angle % 360 + 360) % 360;
            sprite.isDirty = true;
            updatePropertiesPanel();
            updateMoveBlockIcon(Blockly.getMainWorkspace());
        }
    });
    
    const updateAngle = (change: number) => {
        if (!appState.activeSpriteId) return;
        const sprite = appState.sprites[appState.activeSpriteId];
        sprite.state.angle = (sprite.state.angle + change + 360) % 360;
        sprite.isDirty = true;
        updatePropertiesPanel();
        updateMoveBlockIcon(Blockly.getMainWorkspace());
    };

    domElements.directionStepUpButton.addEventListener('click', () => updateAngle(1));
    domElements.directionStepDownButton.addEventListener('click', () => updateAngle(-1));

    domElements.spriteShowCheckbox.addEventListener('change', () => {
        if (!appState.activeSpriteId) return;
        appState.sprites[appState.activeSpriteId].state.visible = domElements.spriteShowCheckbox.checked;
        appState.sprites[appState.activeSpriteId].isDirty = true;
    });

    domElements.directionDial.addEventListener('mousedown', (e) => handleDirectionDialMouseDown(e as MouseEvent));

    domElements.rotationStyleControls.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).closest('.rotation-style-btn');
        if (!target || !appState.activeSpriteId) return;
        const style = (target as HTMLElement).dataset.style as 'all-around' | 'left-right' | 'none';
        const sprite = appState.sprites[appState.activeSpriteId];
        if (sprite && sprite.state.rotationStyle !== style) {
            sprite.state.rotationStyle = style;
            sprite.isDirty = true;
            updatePropertiesPanel();
            updateMoveBlockIcon(Blockly.getMainWorkspace());
        }
    });
}

function initEventListeners() {
    const workspace = Blockly.getMainWorkspace();

    domElements.goButton.addEventListener('click', () => execute());
    domElements.stopButton.addEventListener('click', stopAllExecutions);
    domElements.fullscreenButton.addEventListener('click', () => {
        document.body.classList.toggle('fullscreen-active');
        setTimeout(() => {
            Blockly.svgResize(workspace);
            Object.values(appState.sprites).forEach(sprite => sprite.isDirty = true);
        }, 0);
    });

    // New: Add event listener to the stage for deselection
    domElements.stageElement.addEventListener('mousedown', (e) => {
        if (e.target === domElements.stageElement) {
            setStageSelection(null);
        }
    });

    initSpriteLibrary();
    initBackdropLibrary();
    initSoundLibrary();
    initRecorder();
    initGifEditor();
    initInputPads();
    initAiSpriteGenerator();

    domElements.aiScriptButton.addEventListener('click', () => (document.getElementById('ai-script-modal') as HTMLElement).classList.remove('hidden'));
    domElements.closeAiModalButton.addEventListener('click', () => (document.getElementById('ai-script-modal') as HTMLElement).classList.add('hidden'));
    domElements.aiScriptModal.addEventListener('click', (e) => { if (e.target === domElements.aiScriptModal) (document.getElementById('ai-script-modal') as HTMLElement).classList.add('hidden'); });
    domElements.generateScriptButton.addEventListener('click', () => handleGenerateScript(() => (document.getElementById('ai-script-modal') as HTMLElement).classList.add('hidden')));

    domElements.saveProjectButton.addEventListener('click', handleSaveProject);
    domElements.loadProjectButton.addEventListener('click', () => domElements.loadProjectInput.click());
    domElements.loadProjectInput.addEventListener('change', handleLoadProjectFile);

    setupPropertyPanelListeners();

    document.addEventListener('keydown', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        let key;
        switch (e.key) {
            case ' ':
                key = 'space';
                break;
            case 'ArrowUp':
                key = 'up arrow';
                break;
            case 'ArrowDown':
                key = 'down arrow';
                break;
            case 'ArrowLeft':
                key = 'left arrow';
                break;
            case 'ArrowRight':
                key = 'right arrow';
                break;
            default:
                if (e.key.length === 1) {
                    key = e.key.toLowerCase();
                } else {
                    return; 
                }
        }

        handleKeyPress(key);
        
        if (['space', 'up arrow', 'down arrow', 'left arrow', 'right arrow'].includes(key)) {
            e.preventDefault();
        }
    });

    window.addEventListener('resize', () => {
        Blockly.svgResize(workspace);
        Object.values(appState.sprites).forEach(sprite => sprite.isDirty = true);
    });
}

export function initUI() {
    initEventListeners();
    domElements.stopButton.disabled = true;
    updatePropertiesPanel();
}