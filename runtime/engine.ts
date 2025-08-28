import { api, stoppableWait } from "./api.js";
import { Command, appState, Sprite } from "../state.js";
import { updateSpriteAppearance, updateGifFrame, updateSpeechBubblePosition } from "../ui/rendering.js";
import { domElements } from "../ui/dom.js";
import { getColorAt } from "./colorDetection.js";

declare var Blockly: any;

// Module-level map to hold execution contexts.
// This is the core of the new concurrency model. Each sprite with running
// code gets its own isolated, in-memory workspace to provide a stable
// context for loops and live updates.
const executionWorkspaces = new Map<string, Blockly.Workspace>();

const liveUpdateFieldMap: Record<string, string[]> = {
    'motion_movesteps': ['STEPS', 'SPEED'],
    'motion_turnright': ['DEGREES'],
    'motion_turnleft': ['DEGREES'],
    'motion_setheading': ['DEGREES'],
    'motion_hop': ['HEIGHT'],
    'looks_sayforsecs': ['MESSAGE', 'SECS'],
    'looks_say': ['MESSAGE'],
    'looks_changesizeby': ['DELTA'],
    'looks_shrinkby': ['DELTA'],
    'looks_setsizeto': ['SIZE'],
    'looks_switchbackdrop': ['BACKDROP'],
    'control_wait': ['SECS'],
    'control_repeat': ['TIMES'],
    'sound_playuntildone': ['SOUND_MENU'],
    'sound_play': ['SOUND_MENU'],
    'event_send_envelope': ['ENVELOPE_CHANNEL'],
};

function hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [ parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16) ] : null;
}

function colorDistance(rgb1: [number, number, number], rgb2: [number, number, number]): number {
    const rDiff = rgb1[0] - rgb2[0];
    const gDiff = rgb1[1] - rgb2[1];
    const bDiff = rgb1[2] - rgb2[2];
    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

export async function executeCommands(
    commands: Command[], 
    sprite: Sprite, 
    executionWorkspace: Blockly.Workspace,
    options?: { abortCheck?: () => boolean }, 
    isSubstack = false
) {
    const apiForThisRun: any = { ...api };

    if (options?.abortCheck) {
        const check = options.abortCheck;
        apiForThisRun.wait = async (s: Sprite, secs: number) => await stoppableWait(Number(secs) * 1000, check);
        apiForThisRun.say_for_secs = async (s: Sprite, message: string, secs: number) => {
            s.speechBubbleElement.textContent = message;
            s.speechBubbleElement.classList.remove('hidden');
            updateSpeechBubblePosition(s);
            await stoppableWait(Number(secs) * 1000, check);
            if (!appState.stopSignal && !check()) {
                s.speechBubbleElement.classList.add('hidden');
            }
        };
        apiForThisRun.play_sound_until_done = async (s: Sprite, soundName: string) => {
             if (appState.stopSignal || check()) return;
             const sound = s.sounds.find(snd => snd.name === soundName);
             if (!sound) return;
             return new Promise(resolve => {
                 const audio = new Audio(sound.url);
                 appState.currentlyPlayingSounds.push(audio);
                 let resolved = false;
                 const stopAndResolve = () => {
                     if (resolved) return;
                     resolved = true;
                     audio.removeEventListener('ended', stopAndResolve);
                     clearInterval(intervalId);
                     const index = appState.currentlyPlayingSounds.indexOf(audio);
                     if (index > -1) appState.currentlyPlayingSounds.splice(index, 1);
                     audio.pause();
                     audio.src = '';
                     resolve(void 0);
                 };
                 audio.addEventListener('ended', stopAndResolve);
                 audio.play().catch(stopAndResolve);
                 const intervalId = setInterval(() => {
                     if (appState.stopSignal || check()) {
                         audio.pause();
                         audio.currentTime = 0;
                         stopAndResolve();
                     }
                 }, 50);
             });
        }
    }

    for (const command of commands) {
        if (appState.stopSignal) break;
        if (options?.abortCheck && options.abortCheck()) break;

        let finalArgs = command.args;
        if (command.blockId && command.blockType) {
            const currentBlock = executionWorkspace.getBlockById(command.blockId);
            if (currentBlock && !currentBlock.isDisposed()) {
                const fieldNames = liveUpdateFieldMap[command.blockType];
                if (fieldNames) {
                    finalArgs = fieldNames.map(fieldName => {
                        let value = currentBlock.getFieldValue(fieldName);
                        if (command.blockType === 'looks_shrinkby' && fieldName === 'DELTA') {
                            return String(-Number(value));
                        }
                        return String(value);
                    });
                }
            }
        }
        command.args = finalArgs;

        if (command.type.startsWith('api.')) {
            if (appState.isEventDrivenExecution && command.blockId && !isSubstack) {
                if (appState.eventBlockGuard.has(command.blockId)) {
                    continue; 
                }
                appState.eventBlockGuard.add(command.blockId);
            }
            const funcName = command.type.split('.')[1];
            const func = apiForThisRun[funcName];
            const args = finalArgs.map((arg: any) => {
                const num = Number(arg);
                return isNaN(num) ? arg : num;
            });
            if (func) {
                if (funcName === 'move_steps') {
                    await func(sprite, ...args, command.blockId);
                } else {
                    await func(sprite, ...args);
                }
            }
        } else if (command.type === 'control.repeat' || command.type === 'control.forever') {
            const isForever = command.type === 'control.forever';
            const jsGenerator = Blockly.JavaScript;
            if (!command.blockId) continue;

            if (appState.isEventDrivenExecution && !isSubstack) {
                if (appState.eventBlockGuard.has(command.blockId)) { continue; }
                appState.eventBlockGuard.add(command.blockId);
            }

            const times = isForever ? Infinity : Number(command.args[0]);
            if (isNaN(times)) continue;

            for (let i = 0; i < times; i++) {
                if (appState.stopSignal || (options?.abortCheck && options.abortCheck())) break;
                const loopBlock = executionWorkspace.getBlockById(command.blockId);
                if (!loopBlock || loopBlock.isDisposed()) break;
                const substackCode = jsGenerator.statementToCode(loopBlock, 'SUBSTACK');
                if (substackCode) {
                    try {
                        const commandsToRun = JSON.parse(`[${substackCode}]`);
                        await executeCommands(commandsToRun, sprite, executionWorkspace, options, true);
                    } catch (e) { /* ignore empty substack */ }
                }
                if (isForever) await new Promise(resolve => setTimeout(resolve, 0)); 
            }
        }
    }
}

/**
 * Gets a persistent execution workspace for a sprite, creating it if it doesn't exist.
 * This is crucial for providing a stable context for running scripts.
 */
function getOrCreateExecutionWorkspace(sprite: Sprite): Blockly.Workspace | null {
    if (executionWorkspaces.has(sprite.id)) {
        return executionWorkspaces.get(sprite.id)!;
    }
    const savedState = sprite.workspaceState;
    if (!savedState || Object.keys(savedState).length === 0) {
        return null; // No code, no workspace needed.
    }
    const newWorkspace = new Blockly.Workspace();
    Blockly.serialization.workspaces.load(savedState, newWorkspace);
    executionWorkspaces.set(sprite.id, newWorkspace);
    return newWorkspace;
}

export async function handleSpriteClick(spriteId: string) {
    if (appState.isExecutingOnDemand) return;
    appState.stopSignal = false;
    appState.isExecutingOnDemand = true;
    appState.isEventDrivenExecution = true;
    domElements.goButton.setAttribute('disabled', 'true');
    domElements.stopButton.removeAttribute('disabled');
    document.body.classList.add('script-running');

    const sprite = appState.sprites[spriteId];
    if (!sprite) {
        appState.isExecutingOnDemand = false;
        if (!appState.isRunning) {
            domElements.goButton.removeAttribute('disabled');
            domElements.stopButton.setAttribute('disabled', 'true');
            document.body.classList.remove('script-running');
            appState.isEventDrivenExecution = false;
        }
        return;
    }
    
    try {
        appState.eventBlockGuard.clear();
        const execWorkspace = getOrCreateExecutionWorkspace(sprite);
        if (execWorkspace) {
            const jsGenerator = Blockly.JavaScript;
            const startBlocks = execWorkspace.getBlocksByType('event_when_this_sprite_clicked', false);
            const scriptPromises = startBlocks.map((block: any) => {
                const generatedCode = jsGenerator.blockToCode(block);
                if (generatedCode) {
                    try {
                        const commands = JSON.parse(`[${generatedCode}]`);
                        return executeCommands(commands, sprite, execWorkspace);
                    } catch (e) {
                        console.error("Error parsing generated code for sprite click:", e, "\nCode:", generatedCode);
                    }
                }
                return Promise.resolve();
            });
            await Promise.all(scriptPromises);
        }
    } catch(e) {
        console.error(`Error executing click script for sprite ${sprite.name}:`, e);
    } finally {
        if (!appState.isRunning) {
            domElements.goButton.removeAttribute('disabled');
            domElements.stopButton.setAttribute('disabled', 'true');
            document.body.classList.remove('script-running');
            appState.isEventDrivenExecution = false;
        }
        setTimeout(() => { appState.isExecutingOnDemand = false; }, 100);
        appState.eventBlockGuard.clear();
    }
}

async function triggerBumpEvent(sourceSprite: Sprite, targetSprite: Sprite) {
    const key = `${sourceSprite.id}-${targetSprite.id}`;
    const executionId = Symbol();
    appState.activeBumpScripts.set(key, executionId);
    const abortCheck = () => appState.activeBumpScripts.get(key) !== executionId;

    const execWorkspace = getOrCreateExecutionWorkspace(sourceSprite);
    if (!execWorkspace) return;

    appState.isEventDrivenExecution = true;
    try {
        appState.eventBlockGuard.clear();
        const jsGenerator = Blockly.JavaScript;
        const bumpBlocks = execWorkspace.getBlocksByType('event_when_bumping_sprite', false);
        for (const block of bumpBlocks) {
            if (abortCheck()) break;
            const targetIdInBlock = block.getFieldValue('SPRITE_TARGET');
            if (targetIdInBlock === targetSprite.id) {
                const generatedCode = jsGenerator.blockToCode(block);
                if (generatedCode) {
                    try {
                        const commands = JSON.parse(`[${generatedCode}]`);
                        await executeCommands(commands, sourceSprite, execWorkspace, { abortCheck });
                    } catch (e) {
                        console.error(`Error parsing bump script for ${sourceSprite.name}:`, e, "\nCode:", generatedCode);
                    }
                }
            }
        }
    } catch (e) {
        console.error(`Error processing bump event for ${sourceSprite.name}:`, e);
    } finally {
        if (!appState.isRunning) {
            appState.isEventDrivenExecution = false;
        }
        appState.eventBlockGuard.clear();
    }
}

export async function broadcastEnvelope(workspace: any, channelKey: string) {
    if (appState.stopSignal) return;

    // Save current workspace state before starting
    if (appState.activeSpriteId && appState.sprites[appState.activeSpriteId]) {
        appState.sprites[appState.activeSpriteId].workspaceState = Blockly.serialization.workspaces.save(workspace);
    }
    
    appState.eventBlockGuard.clear();
    appState.isEventDrivenExecution = true;

    const scriptPromises: Promise<void>[] = [];
    for (const sprite of Object.values(appState.sprites)) {
        if (appState.stopSignal) break;
        const execWorkspace = getOrCreateExecutionWorkspace(sprite);
        if (!execWorkspace) continue;
        
        const jsGenerator = Blockly.JavaScript;
        const envelopeBlocks = execWorkspace.getBlocksByType('event_when_envelope_received', false);
        const matchingBlocks = envelopeBlocks.filter((block: any) => block.getFieldValue('ENVELOPE_CHANNEL') === channelKey);
        
        for (const block of matchingBlocks) {
            const generatedCode = jsGenerator.blockToCode(block);
            if (generatedCode) {
                try {
                    const commands = JSON.parse(`[${generatedCode}]`);
                    scriptPromises.push(executeCommands(commands, sprite, execWorkspace));
                } catch (e) {
                    console.error(`Error parsing envelope script for ${sprite.name}:`, e, "\nCode:", generatedCode);
                }
            }
        }
    }

    try {
        await Promise.all(scriptPromises);
    } catch (e) {
        console.error("Error during concurrent envelope script execution:", e);
    } finally {
        if (!appState.isRunning) {
            appState.isEventDrivenExecution = false;
        }
        appState.eventBlockGuard.clear();
    }
}

export async function handleKeyPress(key: string) {
    if (appState.stopSignal || appState.isExecutingKeyPress || appState.isExecutingOnDemand) return;
    const workspace = Blockly.getMainWorkspace();
    const wasAnythingRunning = appState.isRunning;

    appState.isExecutingKeyPress = true;
    appState.isEventDrivenExecution = true;
    if (!wasAnythingRunning) {
        appState.stopSignal = false;
        domElements.goButton.setAttribute('disabled', 'true');
        domElements.stopButton.removeAttribute('disabled');
        document.body.classList.add('script-running');
    }

    if (appState.activeSpriteId && appState.sprites[appState.activeSpriteId]) {
        appState.sprites[appState.activeSpriteId].workspaceState = Blockly.serialization.workspaces.save(workspace);
    }

    const scriptPromises: Promise<void>[] = [];
    try {
        appState.eventBlockGuard.clear();
        for (const sprite of Object.values(appState.sprites)) {
            if (appState.stopSignal) break;
            const execWorkspace = getOrCreateExecutionWorkspace(sprite);
            if (!execWorkspace) continue;

            const jsGenerator = Blockly.JavaScript;
            const keyPressBlocks = execWorkspace.getBlocksByType('event_when_key_pressed', false);
            const matchingBlocks = keyPressBlocks.filter((block: any) => {
                const keyOption = block.getFieldValue('KEY_OPTION');
                return keyOption === 'any' || keyOption === key;
            });
            
            for (const block of matchingBlocks) {
                const generatedCode = jsGenerator.blockToCode(block);
                if (generatedCode) {
                    try {
                        const commands = JSON.parse(`[${generatedCode}]`);
                        scriptPromises.push(executeCommands(commands, sprite, execWorkspace));
                    } catch (e) {
                        console.error(`Error parsing key press script for ${sprite.name}:`, e, "\nCode:", generatedCode);
                    }
                }
            }
        }
        await Promise.all(scriptPromises);
    } finally {
        if (!wasAnythingRunning && !appState.isRunning) {
            domElements.goButton.removeAttribute('disabled');
            domElements.stopButton.setAttribute('disabled', 'true');
            document.body.classList.remove('script-running');
            appState.isEventDrivenExecution = false;
        }
        setTimeout(() => { appState.isExecutingKeyPress = false; }, 100);
        appState.eventBlockGuard.clear();
    }
}

export async function handleBlockClick(startBlock: any) {
    if (appState.isExecutingOnDemand || !startBlock || startBlock.isDisposed()) return;
    
    appState.stopSignal = false;
    appState.isExecutingOnDemand = true;
    appState.isEventDrivenExecution = true;
    domElements.goButton.setAttribute('disabled', 'true');
    domElements.stopButton.removeAttribute('disabled');
    Blockly.getMainWorkspace().highlightBlock(startBlock.id);
    document.body.classList.add('script-running');

    try {
        appState.eventBlockGuard.clear();
        const activeSprite = appState.activeSpriteId ? appState.sprites[appState.activeSpriteId] : null;
        if (activeSprite) {
            const execWorkspace = getOrCreateExecutionWorkspace(activeSprite);
            if (execWorkspace) {
                const jsGenerator = Blockly.JavaScript;
                const generatedCode = jsGenerator.blockToCode(startBlock);
                if (generatedCode) {
                    const commands = JSON.parse(`[${generatedCode}]`);
                    await executeCommands(commands, activeSprite, execWorkspace);
                }
            }
        }
    } catch (e) {
        console.error("Error executing block click:", e);
    } finally {
        Blockly.getMainWorkspace().highlightBlock(null);
        if (!appState.isRunning) {
            domElements.goButton.removeAttribute('disabled');
            domElements.stopButton.setAttribute('disabled', 'true');
            document.body.classList.remove('script-running');
            appState.isEventDrivenExecution = false;
        }
        setTimeout(() => { appState.isExecutingOnDemand = false; }, 100);
        appState.eventBlockGuard.clear();
    }
}

function checkCollisions() {
    const spriteList = Object.values(appState.sprites);
    if (spriteList.length < 2) return;
    const BASE_SPRITE_DIMENSION = 80;
    const baseRadius = BASE_SPRITE_DIMENSION / 2;
    for (let i = 0; i < spriteList.length; i++) {
        for (let j = i + 1; j < spriteList.length; j++) {
            const spriteA = spriteList[i];
            const spriteB = spriteList[j];
            if (!spriteA.state.visible || !spriteB.state.visible) continue;
            const dx = spriteA.state.x - spriteB.state.x;
            const dy = spriteA.state.y - spriteB.state.y;
            const distanceSq = (dx * dx) + (dy * dy);
            const radiusA = baseRadius * (spriteA.state.size / 100);
            const radiusB = baseRadius * (spriteB.state.size / 100);
            const radiiSum = radiusA + radiusB;
            if (distanceSq < (radiiSum * radiiSum)) {
                triggerBumpEvent(spriteA, spriteB);
                triggerBumpEvent(spriteB, spriteA);
            }
        }
    }
}

function checkColorTouching() {
    const COLOR_TOLERANCE = 30;
    for (const trigger of appState.colorTriggers) {
        const sprite = appState.sprites[trigger.spriteId];
        if (!sprite || !sprite.state.visible) {
            trigger.isTouching = false;
            continue;
        }
        const colorUnderSprite = getColorAt(sprite.state.x, sprite.state.y);
        let isMatch = false;
        if (colorUnderSprite) {
            const distance = colorDistance(colorUnderSprite, trigger.targetColorRgb);
            isMatch = distance < COLOR_TOLERANCE;
        }
        trigger.isTouching = isMatch;

        const triggerKey = `${trigger.spriteId}-${trigger.blockId}`;
        const isScriptAlreadyRunning = appState.activeColorTouchScripts.get(triggerKey);
        if (isMatch && !isScriptAlreadyRunning) {
            appState.eventBlockGuard.clear();
            appState.activeColorTouchScripts.set(triggerKey, true);
            const runContinuously = async () => {
                const wasAnythingRunning = appState.isRunning || appState.isExecutingOnDemand || appState.isExecutingKeyPress || appState.activeColorTouchScripts.size > 1;
                appState.isEventDrivenExecution = true;
                if (!wasAnythingRunning) {
                    appState.stopSignal = false;
                    domElements.goButton.setAttribute('disabled', 'true');
                    domElements.stopButton.removeAttribute('disabled');
                    document.body.classList.add('script-running');
                }

                while (true) {
                    const currentTrigger = appState.colorTriggers.find(t => t.spriteId === trigger.spriteId && t.blockId === trigger.blockId);
                    if (!currentTrigger || appState.stopSignal || !currentTrigger.isTouching) break;
                    
                    const execWorkspace = getOrCreateExecutionWorkspace(sprite);
                    if(execWorkspace) {
                        await executeCommands(currentTrigger.substack, sprite, execWorkspace);
                    } else {
                        break;
                    }
                    await new Promise(resolve => requestAnimationFrame(resolve));
                }
                
                appState.activeColorTouchScripts.delete(triggerKey);
                if (!appState.isRunning && !appState.isExecutingOnDemand && !appState.isExecutingKeyPress && appState.activeColorTouchScripts.size === 0) {
                    domElements.goButton.removeAttribute('disabled');
                    domElements.stopButton.setAttribute('disabled', 'true');
                    document.body.classList.remove('script-running');
                    appState.isEventDrivenExecution = false;
                }
                appState.eventBlockGuard.clear();
            };
            runContinuously();
        }
    }
}

export function gameLoop(timestamp: number) {
    if (!appState.lastFrameTimestamp) appState.lastFrameTimestamp = timestamp;
    const deltaTime = timestamp - appState.lastFrameTimestamp;
    appState.lastFrameTimestamp = timestamp;
    for (const sprite of Object.values(appState.sprites)) {
        updateGifFrame(sprite, deltaTime);
        if (sprite.isDirty) {
            updateSpriteAppearance(sprite);
            sprite.isDirty = false;
        }
    }
    if (appState.isRunning) checkCollisions();
    checkColorTouching();
    requestAnimationFrame(gameLoop);
}

export function compileColorTriggers() {
    const workspace = Blockly.getMainWorkspace();
    if (!workspace) return;

    const newTriggers = [];
    try {
        if (appState.activeSpriteId && appState.sprites[appState.activeSpriteId]) {
            appState.sprites[appState.activeSpriteId].workspaceState = Blockly.serialization.workspaces.save(workspace);
        }

        for (const sprite of Object.values(appState.sprites)) {
            const execWorkspace = getOrCreateExecutionWorkspace(sprite) || (executionWorkspaces.has(sprite.id) ? executionWorkspaces.get(sprite.id) : null);
            if(execWorkspace) {
                const jsGenerator = Blockly.JavaScript;
                const colorBlocks = execWorkspace.getBlocksByType('event_when_color_under', false);
                colorBlocks.forEach((block: any) => {
                    const colorHex = block.getFieldValue('COLOR');
                    const targetColorRgb = hexToRgb(colorHex);
                    const substackCode = jsGenerator.blockToCode(block);
                    if (targetColorRgb && substackCode) {
                        try {
                            const commands = JSON.parse(`[${substackCode}]`);
                            const existingTrigger = appState.colorTriggers.find(t => t.spriteId === sprite.id && t.blockId === block.id);
                            newTriggers.push({
                                spriteId: sprite.id,
                                blockId: block.id,
                                targetColorRgb: targetColorRgb,
                                substack: commands,
                                isTouching: existingTrigger ? existingTrigger.isTouching : false,
                            });
                        } catch (e) { /* ignore parse error on empty substack */ }
                    }
                });
            }
        }
    } finally {
        // We don't dispose temp workspaces here because they are persistent now.
    }
    appState.colorTriggers = newTriggers;
}

export function execute() {
    const workspace = Blockly.getMainWorkspace();
    if (appState.isRunning) return;

    stopAllExecutions(); // Full reset, including clearing execution workspaces
    
    if (appState.activeSpriteId && appState.sprites[appState.activeSpriteId]) {
        appState.sprites[appState.activeSpriteId].workspaceState = Blockly.serialization.workspaces.save(workspace);
    }
    appState.isRunning = true;
    appState.stopSignal = false;
    appState.isEventDrivenExecution = true;
    domElements.goButton.setAttribute('disabled', 'true');
    domElements.stopButton.removeAttribute('disabled');
    document.body.classList.add('script-running');
    
    Object.values(appState.sprites).forEach(sprite => {
        sprite.speechBubbleElement.classList.add('hidden');
    });

    const allScriptPromises: Promise<void>[] = [];
    const jsGenerator = Blockly.JavaScript;
    
    for (const sprite of Object.values(appState.sprites)) {
        const execWorkspace = getOrCreateExecutionWorkspace(sprite);
        if (!execWorkspace) continue;

        const startBlocks = execWorkspace.getBlocksByType('event_when_go_clicked', false);
        const scriptPromises = startBlocks.map((block: any) => {
            if (appState.stopSignal) return Promise.resolve();
            const generatedCode = jsGenerator.blockToCode(block);
            if (generatedCode) {
                try {
                    const commands = JSON.parse(`[${generatedCode}]`);
                    return executeCommands(commands, sprite, execWorkspace);
                } catch (e) {
                    console.error("Error parsing generated code:", e, "\nCode:", generatedCode);
                }
            }
            return Promise.resolve();
        });
        allScriptPromises.push(...scriptPromises);
    }
    
    compileColorTriggers();

    if (allScriptPromises.length > 0) {
        Promise.all(allScriptPromises).catch(e => console.error("An error occurred during script execution:", e));
    }
}

export function stopAllExecutions() {
    appState.stopSignal = true;
    appState.isRunning = false;
    appState.isExecutingOnDemand = false;
    appState.isExecutingKeyPress = false;
    appState.isEventDrivenExecution = false;
    appState.activeColorTouchScripts.clear();
    
    // Dispose all execution workspaces and clear the map
    for (const workspace of executionWorkspaces.values()) {
        workspace.dispose();
    }
    executionWorkspaces.clear();

    domElements.goButton.removeAttribute('disabled');
    domElements.stopButton.setAttribute('disabled', 'true');
    document.body.classList.remove('script-running');
    api.stop_all_sounds();
    Object.values(appState.sprites).forEach(sprite => {
        sprite.speechBubbleElement.classList.add('hidden');
    });
}