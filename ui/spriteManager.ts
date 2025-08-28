import { decompressFrames, parseGIF } from "../lib/gifuct-js.js";
import { appState, SerializableSpriteData, Sprite } from "../state.js";
import { domElements } from "./dom.js";
import { handleSpriteMouseDown } from "./dragDrop.js";
import { updatePropertiesPanel } from "./panels.js";
import { refreshSpriteDropdowns } from "../blockly/setup.js";
import { renderSpriteGifFrame } from "./rendering.js";
import { renderSoundList } from "./soundManager.js";
import { SPRITE_LIBRARY } from "../data.js";
import { openGifEditorModal } from "./modals.js";
import { updateMoveBlockIcon } from "./rendering.js";
import { compileColorTriggers } from "../runtime/engine.js";

declare var Blockly: any;

/**
 * Manages which sprite has the visual selection indicator on the stage.
 * @param newId The ID of the sprite to select, or null to deselect all.
 */
export function setStageSelection(newId: string | null) {
    const oldId = appState.stageSelectedSpriteId;
    if (oldId === newId) return;

    // Mark the old sprite as dirty to remove its selection glow
    if (oldId && appState.sprites[oldId]) {
        appState.sprites[oldId].isDirty = true;
    }
    
    appState.stageSelectedSpriteId = newId;

    // Mark the new sprite as dirty to add its selection glow
    if (newId && appState.sprites[newId]) {
        appState.sprites[newId].isDirty = true;
    }
}

export function addNewSprite(imageUrl: string, spriteName: string, initialData?: SerializableSpriteData) {
    const id = initialData ? initialData.id : `sprite${appState.nextSpriteId++}`;
    
    let name: string;
    if (initialData) {
        name = initialData.name;
    } else {
        const baseName = spriteName || 'דמות';
        name = baseName;
        let counter = 2;
        while (Object.values(appState.sprites).some(s => s.name === name)) {
            name = `${baseName} ${counter++}`;
        }
    }

    const isGif = imageUrl.toLowerCase().endsWith('.gif');
    const domElement = document.createElement('div');
    domElement.id = id;
    domElement.className = 'sprite';
    domElements.spriteContainer.appendChild(domElement);

    const speechBubbleElement = document.createElement('div');
    speechBubbleElement.className = 'speech-bubble hidden';
    domElements.speechBubbleContainer.appendChild(speechBubbleElement);

    const spriteInfo = document.createElement('div');
    spriteInfo.className = 'sprite-info';
    spriteInfo.dataset.id = id;
    spriteInfo.innerHTML = `<button class="delete-sprite-btn" aria-label="מחק דמות">&times;</button><div class="thumbnail" style="background-image: url('${imageUrl}');"></div><span>${name}</span>`;
    domElements.spriteListContainer.appendChild(spriteInfo);
    
    const newSprite: Sprite = {
        id, name, domElement, speechBubbleElement,
        state: initialData ? initialData.state : { x: 0, y: 0, angle: 90, size: 100, visible: true, imageUrl, rotationStyle: 'all-around', animationSpeed: 1, hue: 0 },
        workspaceState: initialData ? initialData.workspaceState : {},
        sounds: initialData ? initialData.sounds : [],
        isGif: isGif,
        isDirty: true,
    };

    if (isGif) {
        spriteInfo.classList.add('is-gif');
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-animation-btn';
        editBtn.innerHTML = '✏️';
        editBtn.title = 'שנה מהירות אנימציה';
        editBtn.setAttribute('aria-label', 'שנה מהירות אנימציה');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openGifEditorModal(id);
        });
        spriteInfo.appendChild(editBtn);

        const canvas = document.createElement('canvas');
        domElement.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        if (!ctx) { console.error("Could not get canvas context for sprite"); return; }
        ctx.imageSmoothingEnabled = false;

        const patchCanvas = document.createElement('canvas');
        const patchCtx = patchCanvas.getContext('2d', { willReadFrequently: true });
        if (!patchCtx) return;
        patchCtx.imageSmoothingEnabled = false;

        const fullFrameCanvas = document.createElement('canvas');
        const fullFrameCtx = fullFrameCanvas.getContext('2d', { willReadFrequently: true });
        if (!fullFrameCtx) return;
        fullFrameCtx.imageSmoothingEnabled = false;
        
        newSprite.gifData = {
            frames: [], width: 0, height: 0, backgroundColor: null,
            currentFrameIndex: 0, accumulator: 0,
            canvas: canvas, ctx: ctx,
            patchCanvas, patchCtx,
            fullFrameCanvas, fullFrameCtx,
            previousImageData: null,
        };
        
        fetch(imageUrl)
            .then(res => res.arrayBuffer())
            .then(buffer => {
                const parsedGif = parseGIF(buffer);
                const frames = decompressFrames(parsedGif, false);
                
                if (frames.length > 0 && newSprite.gifData) {
                    newSprite.gifData.frames = frames;
                    const { width, height } = frames[0].dims;
                    newSprite.gifData.width = width;
                    newSprite.gifData.height = height;
                    newSprite.gifData.canvas.width = width;
                    newSprite.gifData.canvas.height = height;
                    newSprite.gifData.fullFrameCanvas.width = width;
                    newSprite.gifData.fullFrameCanvas.height = height;

                    const gct = parsedGif.gct;
                    const bgIndex = parsedGif.lsd.backgroundColorIndex;
                    if (gct && bgIndex < gct.length) {
                        const bgColorRgb = gct[bgIndex];
                        newSprite.gifData.backgroundColor = `rgb(${bgColorRgb[0]}, ${bgColorRgb[1]}, ${bgColorRgb[2]})`;
                    }
                    renderSpriteGifFrame(newSprite);
                }
            })
            .catch(e => console.error("Failed to load GIF for sprite:", e));
    } else {
        domElement.style.backgroundImage = `url('${imageUrl}')`;
    }

    appState.sprites[id] = newSprite;
    if (!initialData) {
        resetSpriteState(newSprite);
    } else {
         newSprite.isDirty = true;
    }
    
    // Updated: Clicking thumbnail deselects from stage, but selects in editor.
    spriteInfo.addEventListener('click', (e) => { 
        if ((e.target as HTMLElement).classList.contains('delete-sprite-btn')) return; 
        setStageSelection(null);
        switchSprite(id); 
    });
    spriteInfo.querySelector('.delete-sprite-btn')?.addEventListener('click', () => deleteSprite(id));
    domElement.addEventListener('mousedown', (e) => handleSpriteMouseDown(e as MouseEvent, id));
    
    if (!initialData) {
        switchSprite(id);
        refreshSpriteDropdowns(Blockly.getMainWorkspace());
    }
}

export function deleteSprite(id: string) {
    if (Object.keys(appState.sprites).length <= 1) {
        alert('לא ניתן למחוק את הדמות האחרונה.');
        return;
    }
    const spriteToDelete = appState.sprites[id];
    if (!spriteToDelete) return;

    // New: Clear stage selection if the deleted sprite was selected
    if (appState.stageSelectedSpriteId === id) {
        setStageSelection(null);
    }
    
    spriteToDelete.domElement.remove();
    spriteToDelete.speechBubbleElement.remove();
    document.querySelector(`.sprite-info[data-id="${id}"]`)?.remove();
    delete appState.sprites[id];

    if (appState.activeSpriteId === id) {
        appState.activeSpriteId = null;
        const nextSpriteToSelectId = Object.keys(appState.sprites)[0];
        if (nextSpriteToSelectId) {
            switchSprite(nextSpriteToSelectId);
        } else {
            Blockly.getMainWorkspace().clear();
            updatePropertiesPanel();
            renderSoundList();
        }
    }
    refreshSpriteDropdowns(Blockly.getMainWorkspace());
    compileColorTriggers();
}

export function switchSprite(id: string) {
    if (appState.activeSpriteId === id || appState.draggingInfo.spriteId) return;
    const workspace = Blockly.getMainWorkspace();

    if (appState.activeSpriteId && appState.sprites[appState.activeSpriteId]) {
        appState.sprites[appState.activeSpriteId].workspaceState = Blockly.serialization.workspaces.save(workspace);
        const oldSpriteElement = appState.sprites[appState.activeSpriteId].domElement;
        oldSpriteElement.classList.remove('selected-on-stage');
        oldSpriteElement.style.outlineWidth = '';
        oldSpriteElement.style.outlineOffset = '';
        document.querySelector(`.sprite-info[data-id="${appState.activeSpriteId}"]`)?.classList.remove('selected');
    }

    appState.activeSpriteId = id;
    const newActiveSprite = appState.sprites[id];

    try {
        Blockly.Events.disable();
        const stateToLoad = newActiveSprite.workspaceState && Object.keys(newActiveSprite.workspaceState).length > 0 ? newActiveSprite.workspaceState : {}; 
        Blockly.serialization.workspaces.load(stateToLoad, workspace);
    } catch (e) {
        console.error('Failed to load workspace state:', e);
        workspace.clear();
    } finally {
        Blockly.Events.enable();
    }
    
    workspace.scrollCenter();
    
    newActiveSprite.domElement.classList.add('selected-on-stage');
    document.querySelector(`.sprite-info[data-id="${id}"]`)?.classList.add('selected');
    
    newActiveSprite.isDirty = true;

    updatePropertiesPanel();
    renderSoundList();
    refreshSpriteDropdowns(workspace);
    updateMoveBlockIcon(workspace);
    compileColorTriggers();
}

export function resetSpriteState(sprite: Sprite) { 
    sprite.state = { ...sprite.state, x: 0, y: 0, angle: 90, size: 100, visible: true, rotationStyle: 'all-around', animationSpeed: 1, hue: 0 }; 
    sprite.isDirty = true;

    if (sprite.isGif && sprite.gifData) {
        sprite.gifData.currentFrameIndex = 0;
        sprite.gifData.accumulator = 0;
        const { fullFrameCtx, backgroundColor, width, height } = sprite.gifData;
        fullFrameCtx.clearRect(0, 0, width, height);
        if (backgroundColor) {
            fullFrameCtx.fillStyle = backgroundColor;
            fullFrameCtx.fillRect(0, 0, width, height);
        }
        sprite.gifData.previousImageData = null;
        renderSpriteGifFrame(sprite);
    }

    sprite.speechBubbleElement.classList.add('hidden'); 
    if (sprite.id === appState.activeSpriteId) { 
        updatePropertiesPanel(); 
    } 
};

export function handleSpriteUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('אנא בחר קובץ תמונה (PNG, JPG, SVG, GIF).');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        const spriteName = file.name.split('.').slice(0, -1).join('.') || 'דמות שהועלתה';
        addNewSprite(imageUrl, spriteName);
        domElements.spriteLibraryModal.classList.add('hidden');
    };
    reader.readAsDataURL(file);
    input.value = '';
};

export function initSpriteLibrary() {
    domElements.spriteGrid.innerHTML = '';
    SPRITE_LIBRARY.forEach(spriteData => {
        const item = document.createElement('div');
        item.className = 'sprite-library-item';
        item.innerHTML = `<img src="${spriteData.url}" alt="${spriteData.name}"><span>${spriteData.name}</span>`;
        item.addEventListener('click', () => {
            addNewSprite(spriteData.url, spriteData.name);
            domElements.spriteLibraryModal.classList.add('hidden');
        });
        domElements.spriteGrid.appendChild(item);
    });

    domElements.addSpriteButton.addEventListener('click', () => domElements.spriteLibraryModal.classList.remove('hidden'));
    domElements.closeLibraryButton.addEventListener('click', () => domElements.spriteLibraryModal.classList.add('hidden'));
    domElements.spriteLibraryModal.addEventListener('click', (e) => { if (e.target === domElements.spriteLibraryModal) domElements.spriteLibraryModal.classList.add('hidden'); });
    domElements.uploadSpriteButton.addEventListener('click', () => domElements.uploadSpriteInput.click());
    domElements.uploadSpriteInput.addEventListener('change', handleSpriteUpload);
}