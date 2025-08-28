

import { GoogleGenAI, Type } from "@google/genai";
import { appState, Command } from "../state.js";
import { addNewSprite } from "../ui/spriteManager.js";
import { domElements } from "../ui/dom.js";

declare var Blockly: any;

const commandToBlockMapping: Record<string, { blockType: string; fields: string[] }> = {
    'api.move_steps': { blockType: 'motion_movesteps', fields: ['STEPS'] },
    'api.turn_right': { blockType: 'motion_turnright', fields: ['DEGREES'] },
    'api.turn_left': { blockType: 'motion_turnleft', fields: ['DEGREES'] },
    'api.set_heading': { blockType: 'motion_setheading', fields: ['DEGREES'] },
    'api.hop': { blockType: 'motion_hop', fields: ['HEIGHT'] },
    'api.say_for_secs': { blockType: 'looks_sayforsecs', fields: ['MESSAGE', 'SECS'] },
    'api.say': { blockType: 'looks_say', fields: ['MESSAGE'] },
    'api.change_size_by': { blockType: 'looks_changesizeby', fields: ['DELTA'] },
    'api.set_size_to': { blockType: 'looks_setsizeto', fields: ['SIZE'] },
    'api.show': { blockType: 'looks_show', fields: [] },
    'api.hide': { blockType: 'looks_hide', fields: [] },
    'api.wait': { blockType: 'control_wait', fields: ['SECS'] },
    'api.play_sound_until_done': { blockType: 'sound_playuntildone', fields: ['SOUND_MENU'] },
    'api.play_sound': { blockType: 'sound_play', fields: ['SOUND_MENU'] },
    'api.stop_all_sounds': { blockType: 'sound_stopallsounds', fields: [] },
    'api.stop_scripts': { blockType: 'control_stop', fields: [] },
    'api.switch_backdrop': { blockType: 'looks_switchbackdrop', fields: ['BACKDROP'] },
    'api.send_envelope': { blockType: 'event_send_envelope', fields: ['ENVELOPE_CHANNEL'] }
};

const ENVELOPE_CHANNEL_KEYS = ['red_heart', 'orange_star', 'yellow_sun', 'green_cloud', 'blue_bolt', 'purple_moon'];

function addBlocksFromCommands(commands: Command[], workspace: any, parentConnection: any = null) {
    let previousBlock: any = null;
    let currentConnection = parentConnection;

    for (const command of commands) {
        if (!command || !command.type) continue;
        
        let mappingInfo;
        let blockType = '';
        
        if (command.type.startsWith('api.')) {
            mappingInfo = commandToBlockMapping[command.type];
            blockType = mappingInfo?.blockType;
        } else if (command.type.startsWith('control.')) {
            const controlType = command.type.split('.')[1];
            blockType = `control_${controlType}`;
        }
        
        if (!blockType) {
            console.warn(`Unknown command type: ${command.type}`);
            continue;
        }

        const newBlock = workspace.newBlock(blockType);

        if (blockType === 'looks_switchbackdrop') {
            const backdropName = command.args[0];
            const backdrop = appState.stageBackdrops.find(b => b.name.toLowerCase() === backdropName?.toLowerCase());
            if (backdrop) {
                newBlock.setFieldValue(backdrop.url, 'BACKDROP');
            }
        } else if (mappingInfo && mappingInfo.fields) {
            mappingInfo.fields.forEach((fieldName, index) => {
                if (command.args && command.args.length > index) {
                    newBlock.setFieldValue(command.args[index], fieldName);
                }
            });
        }

        if (blockType === 'control_repeat') {
            newBlock.setFieldValue(command.args[0], 'TIMES');
        }

        newBlock.initSvg();
        newBlock.render();

        if (currentConnection) {
            currentConnection.connect(newBlock.previousConnection);
        } else if (previousBlock && previousBlock.nextConnection) {
            previousBlock.nextConnection.connect(newBlock.previousConnection);
        }
        
        if ((blockType === 'control_repeat' || blockType === 'control_forever') && command.substack) {
            const substackConnection = newBlock.getInput('SUBSTACK').connection;
            addBlocksFromCommands(command.substack, workspace, substackConnection);
        }
        
        previousBlock = newBlock;
        currentConnection = newBlock.nextConnection;
    }
}

export async function handleGenerateScript(closeAiModal: () => void) {
    if (!appState.activeSpriteId) {
        alert("אנא בחר דמות תחילה.");
        return;
    }
    const generateScriptButton = document.getElementById('generate-script-button') as HTMLButtonElement;
    const aiPromptTextarea = document.getElementById('ai-prompt-textarea') as HTMLTextAreaElement;
    const aiSpinner = document.getElementById('ai-spinner') as HTMLElement;
    const workspace = Blockly.getMainWorkspace();

    const userPrompt = aiPromptTextarea.value.trim();
    if (!userPrompt) {
        alert("אנא תאר מה תרצה שהדמות תעשה.");
        return;
    }
    if (userPrompt.length > 1000) {
        alert("הבקשה ארוכה מדי. אנא קצר אותה (עד 1000 תווים).");
        return;
    }

    generateScriptButton.disabled = true;
    aiSpinner.classList.remove('hidden');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const activeSprite = appState.sprites[appState.activeSpriteId];
        const otherSpriteNames = Object.values(appState.sprites).filter(s => s.id !== appState.activeSpriteId).map(s => s.name);
        const soundNames = activeSprite.sounds.map(s => s.name);
        const backdropNames = appState.stageBackdrops.map(b => b.name);
        
        const context = `
- The current sprite is named "${activeSprite.name}".
- Other available sprites: [${otherSpriteNames.join(', ') || 'None'}].
- Available sounds for this sprite: [${soundNames.join(', ') || 'None'}].
- Available backdrops: [${backdropNames.join(', ') || 'None'}].
- Available message channels (for send_envelope): [${ENVELOPE_CHANNEL_KEYS.join(', ')}].
        `;

        const commandList = `
- api.move_steps(steps: number): Move forward.
- api.turn_right(degrees: number): Turn right.
- api.turn_left(degrees: number): Turn left.
- api.set_heading(degrees: number): Set direction (0=up, 90=right, 180=down, -90=left).
- api.hop(height: number): Makes the sprite jump upwards by a certain height and land back in the same spot.
- api.say_for_secs(message: string, seconds: number): Show a speech bubble for a duration.
- api.say(message: string): Show a speech bubble permanently.
- api.change_size_by(delta: number): Change size. Use a negative number to shrink.
- api.set_size_to(size: number): Set size to a percentage.
- api.show(): Make the sprite visible.
- api.hide(): Make the sprite invisible.
- api.wait(seconds: number): Pause the script.
- api.play_sound_until_done(soundName: string): Play a sound and wait for it to finish.
- api.play_sound(soundName: string): Play a sound without waiting.
- api.stop_all_sounds(): Stop all playing sounds.
- api.stop_scripts(): Stops all running scripts.
- api.switch_backdrop(backdropName: string): Change the stage background. The argument must be the backdrop *name* from the available list.
- api.send_envelope(channelKey: string): Send a message on a specific channel.
- control.repeat(times: number): A loop block. Contains a 'substack' of commands to repeat.
- control.forever(): An infinite loop block. Contains a 'substack' of commands.
        `;

        const systemInstruction = `You are an expert assistant that writes scripts for a block-based coding environment like Scratch.
Translate the user's request into a script.
You MUST output a valid JSON object with a single key, "script", which is an array of command objects.

PROJECT CONTEXT:
${context}

AVAILABLE COMMANDS:
${commandList}

RULES:
1. ONLY use the commands listed. Do not invent commands.
2. The output MUST be a single, valid JSON object: { "script": [...] }.
3. For 'play_sound_...' and 'switch_backdrop', use names from the context.
4. For 'control.repeat' and 'control.forever', the command object MUST include a "substack" key with an array of nested command objects.
5. Arguments in the 'args' array for numeric values should be passed as strings. The application will parse them. E.g., for move_steps(10), use "args": ["10"].
6. Do not wrap the JSON in markdown backticks or other text.
`;
        
        const fullPrompt = `User request: "${userPrompt}"`;
        
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                script: {
                    type: Type.ARRAY,
                    description: "An array of command objects representing the script.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING },
                            args: { type: Type.ARRAY, items: { type: Type.STRING } },
                            substack: {
                                type: Type.ARRAY,
                                description: "A nested list of commands for control blocks.",
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        type: { type: Type.STRING },
                                        args: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        substack: { 
                                            type: Type.ARRAY, 
                                            items: { 
                                                type: Type.OBJECT,
                                                properties: {
                                                    type: { type: Type.STRING },
                                                    args: { type: Type.ARRAY, items: { type: Type.STRING } },
                                                }
                                            } 
                                        }
                                    },
                                    required: ["type"]
                                }
                            }
                        },
                        required: ["type"]
                    }
                }
            },
            required: ["script"]
        };
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });
        
        const responseText = response.text.trim();
        const generatedJson = JSON.parse(responseText);
        
        if (generatedJson && generatedJson.script) {
            workspace.clear(); 
            addBlocksFromCommands(generatedJson.script, workspace, null);
            workspace.render();
            Blockly.svgResize(workspace);
            (Blockly as any).getMainWorkspace().cleanUp();
            closeAiModal();
        } else {
            throw new Error("Invalid JSON structure received from AI.");
        }

    } catch (error) {
        console.error("Error generating script:", error);
        alert("מצטערים, אירעה שגיאה ביצירת התסריט. אנא בדוק את הקונסול לפרטים.");
    } finally {
        generateScriptButton.disabled = false;
        aiSpinner.classList.add('hidden');
    }
}


// --- AI SPRITE GENERATOR ---

function resetGeneratorState() {
    domElements.aiSpritePreviewImage.classList.add('hidden');
    domElements.aiSpritePreviewImage.src = '';
    domElements.addGeneratedSpriteButton.disabled = true;
    domElements.removeBackgroundButton.disabled = true;
    appState.aiSpriteGeneratorState.generatedImageUrl = null;
    appState.aiSpriteGeneratorState.lastPrompt = null;
}

export async function handleGenerateSprite() {
    const prompt = domElements.aiSpritePromptTextarea.value.trim();
    if (!prompt) {
        alert("אנא תאר את הדמות שברצונך ליצור.");
        return;
    }

    domElements.generateSpriteButton.disabled = true;
    domElements.addGeneratedSpriteButton.disabled = true;
    domElements.removeBackgroundButton.disabled = true;
    domElements.aiSpritePreviewImage.classList.add('hidden');
    domElements.aiSpriteGeneratorSpinner.classList.remove('hidden');
    
    appState.aiSpriteGeneratorState.lastPrompt = prompt;

    // Enhance prompt for better results with transparency
    const fullPrompt = `simple flat vector clipart of ${prompt}, clean lines, vibrant colors, on a transparent background, alpha channel`;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: fullPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
              aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
            
            appState.aiSpriteGeneratorState.generatedImageUrl = imageUrl;

            domElements.aiSpritePreviewImage.src = imageUrl;
            domElements.aiSpritePreviewImage.classList.remove('hidden');
            domElements.addGeneratedSpriteButton.disabled = false;
            domElements.removeBackgroundButton.disabled = false;
        } else {
            throw new Error("No image was generated.");
        }

    } catch (error) {
        console.error("Error generating sprite:", error);
        alert("מצטערים, אירעה שגיאה ביצירת הדמות. אנא נסה שוב.");
        resetGeneratorState();
    } finally {
        domElements.aiSpriteGeneratorSpinner.classList.add('hidden');
        domElements.generateSpriteButton.disabled = false;
    }
}

export function handleAddGeneratedSpriteToProject() {
    const { generatedImageUrl, lastPrompt } = appState.aiSpriteGeneratorState;

    if (generatedImageUrl && lastPrompt) {
        addNewSprite(generatedImageUrl, lastPrompt);
        
        // Close both modals
        domElements.aiSpriteGeneratorModal.classList.add('hidden');
        domElements.spriteLibraryModal.classList.add('hidden');

        // Reset the generator for next time
        resetGeneratorState();
        domElements.aiSpritePromptTextarea.value = '';
    }
}

function handleRemoveBackground() {
    const imageUrl = appState.aiSpriteGeneratorState.generatedImageUrl;
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const tolerance = 240; // Pixels with R,G,B values above this will be transparent

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r > tolerance && g > tolerance && b > tolerance) {
                data[i + 3] = 0; // Make transparent
            }
        }

        ctx.putImageData(imageData, 0, 0);
        const newImageUrl = canvas.toDataURL('image/png');

        // Update state and UI
        appState.aiSpriteGeneratorState.generatedImageUrl = newImageUrl;
        domElements.aiSpritePreviewImage.src = newImageUrl;
    };
    img.src = imageUrl;
}


export function initAiSpriteGenerator() {
    domElements.aiCreateSpriteButton.addEventListener('click', () => {
        domElements.aiSpriteGeneratorModal.classList.remove('hidden');
    });

    domElements.closeAiGeneratorButton.addEventListener('click', () => {
        domElements.aiSpriteGeneratorModal.classList.add('hidden');
    });

    domElements.aiSpriteGeneratorModal.addEventListener('click', (e) => {
        if (e.target === domElements.aiSpriteGeneratorModal) {
            domElements.aiSpriteGeneratorModal.classList.add('hidden');
        }
    });

    domElements.generateSpriteButton.addEventListener('click', handleGenerateSprite);
    domElements.addGeneratedSpriteButton.addEventListener('click', handleAddGeneratedSpriteToProject);
    domElements.removeBackgroundButton.addEventListener('click', handleRemoveBackground);
}