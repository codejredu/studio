
import { BACKDROP_LIBRARY } from "../data.js";
import { appState, Backdrop } from "../state.js";
import { refreshBackdropDropdowns } from "../blockly/setup.js";
import { domElements } from "./dom.js";
import { updateDetectionCanvas } from "../runtime/colorDetection.js";

declare var Blockly: any;

export function setStageBackdrop(url: string, selectedThumbnail: HTMLElement) {
    domElements.stageElement.style.backgroundImage = `url('${url}')`;
    appState.activeBackdropUrl = url;
    const currentSelected = domElements.backdropThumbnailList.querySelector('.selected');
    currentSelected?.classList.remove('selected');
    selectedThumbnail.classList.add('selected');
    updateDetectionCanvas(url).catch(err => console.error("Failed to update detection canvas:", err));
}

export function renderBackdropThumbnails() {
    domElements.backdropThumbnailList.innerHTML = '';
    appState.stageBackdrops.forEach(backdrop => {
        const item = document.createElement('div');
        item.className = 'backdrop-thumbnail';
        item.style.backgroundImage = `url('${backdrop.url}')`;
        item.title = backdrop.name;
        item.dataset.url = backdrop.url;
        item.addEventListener('click', () => setStageBackdrop(backdrop.url, item));
        if (backdrop.url === appState.activeBackdropUrl) {
            item.classList.add('selected');
        }
        domElements.backdropThumbnailList.appendChild(item);
    });
}

export function addBackdropToProject(backdropData: Backdrop) {
    const isAlreadyAdded = appState.stageBackdrops.some(b => b.url === backdropData.url); 
    if (!isAlreadyAdded) { 
        appState.stageBackdrops.push(backdropData); 
        renderBackdropThumbnails(); 
        refreshBackdropDropdowns(Blockly.getMainWorkspace());
    } 
    const thumbnailElement = domElements.backdropThumbnailList.querySelector(`.backdrop-thumbnail[data-url="${backdropData.url}"]`) as HTMLElement; 
    if (thumbnailElement) {
        setStageBackdrop(backdropData.url, thumbnailElement);
    } 
}

export function handleBackdropUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
        alert('אנא בחר קובץ תמונה (PNG, JPG, SVG).');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        const backdropName = file.name.split('.').slice(0, -1).join('.') || 'רקע שהועלה';
        const backdropData: Backdrop = { url: imageUrl, name: backdropName };
        addBackdropToProject(backdropData);
        domElements.backdropLibraryModal.classList.add('hidden');
    };
    reader.readAsDataURL(file);
    input.value = '';
};

export function initBackdropLibrary() {
    domElements.backdropGrid.innerHTML = '';
    BACKDROP_LIBRARY.forEach(backdropData => {
        const item = document.createElement('div');
        item.className = 'backdrop-library-item';
        item.innerHTML = `<div class="backdrop-library-preview" style="background-image: url('${backdropData.url}')"></div><span>${backdropData.name}</span>`;
        item.addEventListener('click', () => {
            addBackdropToProject(backdropData);
            domElements.backdropLibraryModal.classList.add('hidden');
        });
        domElements.backdropGrid.appendChild(item);
    });

    domElements.addBackdropButton.addEventListener('click', () => domElements.backdropLibraryModal.classList.remove('hidden'));
    domElements.closeBackdropLibraryButton.addEventListener('click', () => domElements.backdropLibraryModal.classList.add('hidden'));
    domElements.backdropLibraryModal.addEventListener('click', (e) => { if (e.target === domElements.backdropLibraryModal) domElements.backdropLibraryModal.classList.add('hidden'); });
    domElements.uploadBackdropButton.addEventListener('click', () => domElements.uploadBackdropInput.click());
    domElements.uploadBackdropInput.addEventListener('change', handleBackdropUpload);
}