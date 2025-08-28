
import { appState, ProjectData, SerializableSpriteData } from "../state.js";
import { addNewSprite, switchSprite } from "../ui/spriteManager.js";
import { domElements } from "../ui/dom.js";
import { renderBackdropThumbnails, setStageBackdrop } from "../ui/backdropManager.js";
import { updatePropertiesPanel } from "../ui/panels.js";
import { renderSoundList } from "../ui/soundManager.js";
import { stopAllExecutions } from "../runtime/engine.js";

declare var Blockly: any;

function serializeProject(): ProjectData {
    const workspace = Blockly.getMainWorkspace();
    if (appState.activeSpriteId && appState.sprites[appState.activeSpriteId]) {
        appState.sprites[appState.activeSpriteId].workspaceState = Blockly.serialization.workspaces.save(workspace);
    }

    const serializableSprites: Record<string, SerializableSpriteData> = {};
    for (const id in appState.sprites) {
        const sprite = appState.sprites[id];
        serializableSprites[id] = {
            id: sprite.id,
            name: sprite.name,
            state: sprite.state,
            sounds: sprite.sounds,
            workspaceState: sprite.workspaceState,
            isGif: sprite.isGif,
        };
    }

    return {
        sprites: serializableSprites,
        stageBackdrops: appState.stageBackdrops,
        activeBackdropUrl: appState.activeBackdropUrl,
        nextSpriteId: appState.nextSpriteId,
        activeSpriteId: appState.activeSpriteId
    };
}

export function handleSaveProject() {
    const projectData = serializeProject();
    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function handleLoadProjectFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            const projectData = JSON.parse(text) as ProjectData;

            if (!projectData.sprites || !projectData.stageBackdrops || !projectData.nextSpriteId) {
                throw new Error("Invalid project file format.");
            }

            loadProject(projectData);
        } catch (error) {
            console.error("Failed to load project:", error);
            alert("שגיאה בטעינת הקובץ. אנא ודא שזהו קובץ פרויקט תקין.");
        } finally {
            input.value = '';
        }
    };
    reader.readAsText(file);
}

function loadProject(data: ProjectData) {
    const workspace = Blockly.getMainWorkspace();
    stopAllExecutions();

    domElements.spriteContainer.innerHTML = '';
    domElements.speechBubbleContainer.innerHTML = '';
    domElements.spriteListContainer.innerHTML = '';
    domElements.backdropThumbnailList.innerHTML = '';
    domElements.soundListContainer.innerHTML = '';
    workspace.clear();
    
    appState.sprites = {};
    appState.stageBackdrops = [];
    appState.activeSpriteId = null;
    appState.activeBackdropUrl = null;

    appState.nextSpriteId = data.nextSpriteId;
    appState.stageBackdrops = data.stageBackdrops || [];
    appState.activeBackdropUrl = data.activeBackdropUrl || null;
    
    renderBackdropThumbnails();
    if (appState.activeBackdropUrl) {
        const thumbnail = domElements.backdropThumbnailList.querySelector(`.backdrop-thumbnail[data-url="${appState.activeBackdropUrl}"]`) as HTMLElement;
        if (thumbnail) {
            setStageBackdrop(appState.activeBackdropUrl, thumbnail);
        }
    }
    
    Object.values(data.sprites).forEach(spriteData => {
        addNewSprite(spriteData.state.imageUrl, spriteData.name, spriteData);
    });
    
    const newActiveId = data.activeSpriteId;
    if (newActiveId && appState.sprites[newActiveId]) {
        switchSprite(newActiveId);
    } else if (Object.keys(appState.sprites).length > 0) {
        switchSprite(Object.keys(appState.sprites)[0]);
    } else {
        updatePropertiesPanel();
        renderSoundList();
    }
}