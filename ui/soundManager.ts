
import { SOUND_LIBRARY } from "../data.js";
import { appState, Sound } from "../state.js";
import { domElements } from "./dom.js";

declare var Blockly: any;

const getIconForSound = (name: string): string => {
    const lowerName = name.toLowerCase();
    const transportIcon = `<svg viewBox="0 0 24 24"><path d="M20,8h-3V4h-2v4h-4V4H9v4H6c-2.21,0-4,1.79-4,4s1.79,4,4,4h1v4h2v-4h6v4h2v-4h1c2.21,0,4-1.79,4-4S22.21,8,20,8z M6,14c-1.1,0-2-0.9-2-2s0.9-2,2-2h12c1.1,0,2,0.9,2,2s-0.9,2-2,2H6z"/></svg>`;
    const animalIcon = `<svg viewBox="0 0 24 24"><path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,20c-4.41,0-8-3.59-8-8s3.59-8,8-8s8,3.59,8,8 S16.41,20,12,20z M12,6c-1.66,0-3,1.34-3,3s1.34,3,3,3s3-1.34,3-3S13.66,6,12,6z M18,16.5c0-1.5-3-2.5-6-2.5s-6,1-6,2.5V18h12V16.5z"/></svg>`;
    const effectIcon = `<svg viewBox="0 0 24 24"><path d="M19,9h-4V3H9v6H5l7,7L19,9z"/></svg>`;
    const defaultIcon = `<svg viewBox="0 0 24 24"><path d="M12,3v10.55c-0.59-0.34-1.27-0.55-2-0.55c-2.21,0-4,1.79-4,4s1.79,4,4,4s4-1.79,4-4V7h4V3H12z"/></svg>`;

    if (['boat', 'car', 'airplane', 'cessna', 'f15'].some(k => lowerName.includes(k))) return transportIcon;
    if (['animal', 'vole', 'bird', 'partridge', 'shrew', 'flycatcher', 'dog', 'leopard', 'lion', 'whale'].some(k => lowerName.includes(k))) return animalIcon;
    if (['ding', 'door', 'emptying', 'land'].some(k => lowerName.includes(k))) return effectIcon;
    return defaultIcon;
}

export function renderSoundList() {
    domElements.soundListContainer.innerHTML = '';
    const sprite = appState.activeSpriteId ? appState.sprites[appState.activeSpriteId] : null;
    if (!sprite) return;
    sprite.sounds.forEach(sound => {
        const item = document.createElement('div');
        item.className = 'sound-item';
        const iconSVG = getIconForSound(sound.name);
        item.innerHTML = `
            <button class="delete-sound-btn" aria-label="מחק ${sound.name}">&times;</button>
            <div class="sound-item-icon-wrapper" role="button" aria-label="נגן ${sound.name}">
                ${iconSVG}
            </div>
            <span class="sound-name">${sound.name}</span>
        `;
        item.querySelector('.sound-item-icon-wrapper')?.addEventListener('click', () => { new Audio(sound.url).play(); });
        item.querySelector('.delete-sound-btn')?.addEventListener('click', () => deleteSoundFromSprite(sound.name));
        domElements.soundListContainer.appendChild(item);
    });
}

export function addSoundToSprite(soundData: Sound) {
    if (!appState.activeSpriteId) return;
    const sprite = appState.sprites[appState.activeSpriteId];
    const isAlreadyAdded = sprite.sounds.some(s => s.url === soundData.url);
    if (!isAlreadyAdded) {
        sprite.sounds.push(soundData);
        renderSoundList();
        Blockly.getMainWorkspace().getAllBlocks(false).forEach((block: any) => {
            if (block.type === 'sound_play' || block.type === 'sound_playuntildone') {
                const dropdown = block.getField('SOUND_MENU');
                if (dropdown) dropdown.getOptions(false);
            }
        });
    }
}

function deleteSoundFromSprite(soundName: string) {
    if (!appState.activeSpriteId) return;
    const sprite = appState.sprites[appState.activeSpriteId];
    sprite.sounds = sprite.sounds.filter(s => s.name !== soundName);
    renderSoundList();
}

export function initSoundLibrary() {
    domElements.soundGrid.innerHTML = '';
    SOUND_LIBRARY.forEach(soundData => {
        const item = document.createElement('div');
        item.className = 'sound-library-item';
        item.innerHTML = `
            <div class="sound-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path>
                </svg>
            </div>
            <span>${soundData.name}</span>
        `;
        item.addEventListener('click', () => {
            addSoundToSprite(soundData);
            domElements.soundLibraryModal.classList.add('hidden');
        });
        domElements.soundGrid.appendChild(item);
    });

    domElements.addSoundButton.addEventListener('click', () => domElements.soundLibraryModal.classList.remove('hidden'));
    domElements.closeSoundLibraryButton.addEventListener('click', () => domElements.soundLibraryModal.classList.add('hidden'));
    domElements.soundLibraryModal.addEventListener('click', (e) => { if (e.target === domElements.soundLibraryModal) domElements.soundLibraryModal.classList.add('hidden'); });
}