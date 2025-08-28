

import { appState } from "../state.js";
import { domElements } from "./dom.js";

export function updatePropertiesPanel() {
    const sprite = appState.activeSpriteId ? appState.sprites[appState.activeSpriteId] : null;
    if (sprite) {
        domElements.propertiesPanel.style.opacity = '1';
        domElements.propertiesPanel.style.pointerEvents = 'auto';

        domElements.spriteNameInput.value = sprite.name;
        domElements.spriteNameInput.disabled = false;

        domElements.spriteXSlider.value = String(Math.round(sprite.state.x));
        domElements.spriteXNum.value = String(Math.round(sprite.state.x));
        domElements.spriteYSlider.value = String(Math.round(sprite.state.y));
        domElements.spriteYNum.value = String(Math.round(sprite.state.y));
        domElements.spriteSizeSlider.value = String(sprite.state.size);
        domElements.spriteSizeNum.value = String(sprite.state.size);
        domElements.spriteHueSlider.value = String(sprite.state.hue);
        domElements.spriteHueNum.value = String(sprite.state.hue);
        
        // Update all direction-related UI elements
        const roundedAngle = Math.round(sprite.state.angle);
        const displayAngle = (roundedAngle % 360 + 360) % 360; // Ensure 0-359 range
        domElements.spriteDirectionNum.value = String(displayAngle);
        domElements.directionDialHandlePivot.style.transform = `rotate(${sprite.state.angle}deg)`;

        domElements.spriteShowCheckbox.checked = sprite.state.visible;

        document.querySelectorAll('.rotation-style-btn').forEach(btn => {
            const button = btn as HTMLElement;
            button.classList.toggle('selected', button.dataset.style === sprite.state.rotationStyle);
        });

    } else {
        domElements.propertiesPanel.style.opacity = '0.5';
        domElements.propertiesPanel.style.pointerEvents = 'none';
        domElements.spriteNameInput.value = '';
        domElements.spriteNameInput.disabled = true;
    }
}
