

import { appState, Sprite } from "../state.js";
import { setStageBackdrop } from "../ui/backdropManager.js";
import { updatePropertiesPanel } from "../ui/panels.js";
import { applyEdgeWrap, updateSpeechBubblePosition } from "../ui/rendering.js";
import { broadcastEnvelope } from "./engine.js";

declare var Blockly: any;

export const stoppableWait = (ms: number, abortCheck?: () => boolean) => {
    return new Promise(resolve => {
        const checkInterval = 16; // Check roughly every frame
        let remaining = ms;
        const intervalId = setInterval(() => {
            if (appState.stopSignal || (abortCheck && abortCheck())) {
                clearInterval(intervalId);
                resolve(void 0);
                return;
            }
            remaining -= checkInterval;
            if (remaining <= 0) {
                clearInterval(intervalId);
                resolve(void 0);
            }
        }, checkInterval);
    });
};

export const api = {
    move_steps: async (sprite: Sprite, steps: number, _initialSpeed: 'slow' | 'medium' | 'fast' = 'medium', blockId?: string) => {
        if (appState.stopSignal || isNaN(steps)) return;

        const finalSteps = steps;
        if (finalSteps === 0) return;

        const workspace = Blockly.getMainWorkspace();
        
        const getSpeedInPps = (speed: string): number => {
            switch (speed) {
                case 'fast': return 300;
                case 'slow': return 75;
                case 'medium': default: return 150;
            }
        };

        let distanceTraveled = 0;
        let lastTimestamp = performance.now();
        
        const angleInRad = sprite.state.angle * (Math.PI / 180);
        const directionX = Math.sin(angleInRad);
        const directionY = Math.cos(angleInRad);

        while (Math.abs(distanceTraveled) < Math.abs(finalSteps)) {
            if (appState.stopSignal) break;

            const currentTimestamp = await new Promise<number>(resolve => requestAnimationFrame(resolve));
            const deltaTime = (currentTimestamp - lastTimestamp) / 1000.0;
            lastTimestamp = currentTimestamp;

            let currentSpeed = _initialSpeed;
            if (blockId && workspace) {
                const block = workspace.getBlockById(blockId);
                if (block && !block.isDisposed()) {
                    currentSpeed = block.getFieldValue('SPEED');
                }
            }

            const pps = getSpeedInPps(currentSpeed as string);
            let distanceThisFrame = pps * deltaTime * Math.sign(finalSteps);
            
            if (Math.abs(distanceTraveled) + Math.abs(distanceThisFrame) > Math.abs(finalSteps)) {
                distanceThisFrame = Math.sign(finalSteps) * (Math.abs(finalSteps) - Math.abs(distanceTraveled));
            }

            distanceTraveled += distanceThisFrame;

            sprite.state.x += distanceThisFrame * directionX;
            sprite.state.y += distanceThisFrame * directionY;
            sprite.isDirty = true;
            updatePropertiesPanel();
        }

        applyEdgeWrap(sprite);
        sprite.isDirty = true;
        updatePropertiesPanel();
    },
    turn_right: async (sprite: Sprite, degrees: number) => {
        if (appState.stopSignal || isNaN(degrees)) return;
        const finalDegrees = degrees;
        if (finalDegrees === 0) return;

        const turnSpeed = 360; // degrees per second
        
        let degreesTurned = 0;
        let lastTimestamp = performance.now();

        while (Math.abs(degreesTurned) < Math.abs(finalDegrees)) {
            if (appState.stopSignal) break;

            const currentTimestamp = await new Promise<number>(resolve => requestAnimationFrame(resolve));
            const deltaTime = (currentTimestamp - lastTimestamp) / 1000.0;
            lastTimestamp = currentTimestamp;
            
            let degreesThisFrame = turnSpeed * deltaTime * Math.sign(finalDegrees);

            const remainingDegrees = Math.abs(finalDegrees) - Math.abs(degreesTurned);
            if (Math.abs(degreesThisFrame) > remainingDegrees) {
                degreesThisFrame = Math.sign(finalDegrees) * remainingDegrees;
            }
            
            degreesTurned += degreesThisFrame;
            
            sprite.state.angle += degreesThisFrame;
            sprite.isDirty = true;
            updatePropertiesPanel();
        }

        sprite.isDirty = true;
        updatePropertiesPanel();
    },
    turn_left: async (sprite: Sprite, degrees: number) => {
        if (appState.stopSignal || isNaN(degrees)) return;
        const finalDegrees = degrees;
        if (finalDegrees === 0) return;

        const turnSpeed = 360; // degrees per second
        
        let degreesTurned = 0;
        let lastTimestamp = performance.now();

        while (Math.abs(degreesTurned) < Math.abs(finalDegrees)) {
            if (appState.stopSignal) break;

            const currentTimestamp = await new Promise<number>(resolve => requestAnimationFrame(resolve));
            const deltaTime = (currentTimestamp - lastTimestamp) / 1000.0;
            lastTimestamp = currentTimestamp;
            
            let degreesThisFrame = turnSpeed * deltaTime * Math.sign(finalDegrees);

            const remainingDegrees = Math.abs(finalDegrees) - Math.abs(degreesTurned);
            if (Math.abs(degreesThisFrame) > remainingDegrees) {
                degreesThisFrame = Math.sign(finalDegrees) * remainingDegrees;
            }
            
            degreesTurned += degreesThisFrame;
            
            sprite.state.angle -= degreesThisFrame;
            sprite.isDirty = true;
            updatePropertiesPanel();
        }

        sprite.isDirty = true;
        updatePropertiesPanel();
    },
    set_heading: async (sprite: Sprite, degrees: number) => { if (appState.stopSignal || isNaN(degrees)) return; sprite.state.angle = degrees; sprite.isDirty = true; updatePropertiesPanel(); },
    hop: async (sprite: Sprite, height: number) => {
        if (isNaN(height) || height <= 0 || appState.stopSignal) return;
    
        const originalY = sprite.state.y;
        const duration = Math.max(200, height * 8); // Duration based on height
        const startTime = Date.now();
        
        while(true) {
            if (appState.stopSignal) {
                sprite.state.y = originalY;
                sprite.isDirty = true;
                updatePropertiesPanel();
                return;
            }
    
            const elapsed = Date.now() - startTime;
            let progress = elapsed / duration;
    
            if (progress >= 1) {
                break; // Animation finished
            }
            
            const parabola = -4 * (progress * progress) + (4 * progress);
            sprite.state.y = originalY + height * parabola;
    
            sprite.isDirty = true;
            updatePropertiesPanel();
            await stoppableWait(16); // wait for next frame
        }
        
        sprite.state.y = originalY;
        sprite.isDirty = true;
        updatePropertiesPanel();
    },
    say_for_secs: async (sprite: Sprite, message: string, secs: number) => { if (isNaN(secs)) secs = 0; sprite.speechBubbleElement.textContent = message; sprite.speechBubbleElement.classList.remove('hidden'); updateSpeechBubblePosition(sprite); await stoppableWait(secs * 1000); if (!appState.stopSignal) { sprite.speechBubbleElement.classList.add('hidden'); } },
    say: async (sprite: Sprite, message: string) => { sprite.speechBubbleElement.textContent = message; sprite.speechBubbleElement.classList.remove('hidden'); updateSpeechBubblePosition(sprite); },
    change_size_by: async (sprite: Sprite, delta: number) => { if (isNaN(delta)) return; sprite.state.size += delta; sprite.isDirty = true; updatePropertiesPanel(); },
    set_size_to: async (sprite: Sprite, size: number) => { if (isNaN(size)) return; sprite.state.size = size; sprite.isDirty = true; updatePropertiesPanel(); },
    show: async (sprite: Sprite) => { sprite.state.visible = true; sprite.isDirty = true; updatePropertiesPanel(); },
    hide: async (sprite: Sprite) => { sprite.state.visible = false; sprite.isDirty = true; updatePropertiesPanel(); },
    wait: async (sprite: Sprite, secs: number) => { if (isNaN(secs)) return; await stoppableWait(secs * 1000); },
    stop_scripts: async () => {
        appState.stopSignal = true;
    },
    play_sound: async (sprite: Sprite, soundName: string) => {
        if (appState.stopSignal) return;
        const sound = sprite.sounds.find(s => s.name === soundName);
        if (!sound) return;
        const audio = new Audio(sound.url);
        appState.currentlyPlayingSounds.push(audio);
        audio.play();
    },
    play_sound_until_done: async (sprite: Sprite, soundName: string) => {
        if (appState.stopSignal) return;
        const sound = sprite.sounds.find(s => s.name === soundName);
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
                audio.src = ''; // Release resource
                resolve(void 0);
            };
            
            audio.addEventListener('ended', stopAndResolve);
            audio.play().catch(stopAndResolve);
            
            const intervalId = setInterval(() => {
                if (appState.stopSignal) {
                    audio.pause();
                    audio.currentTime = 0;
                    stopAndResolve();
                }
            }, 50);
        });
    },
    stop_all_sounds: async () => {
        appState.currentlyPlayingSounds.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        appState.currentlyPlayingSounds = [];
    },
    switch_backdrop: async (sprite: Sprite, backdropUrl: string) => {
        const thumbnail = document.getElementById('backdrop-thumbnail-list')!.querySelector(`.backdrop-thumbnail[data-url="${backdropUrl}"]`) as HTMLElement;
        if (thumbnail) {
            setStageBackdrop(backdropUrl, thumbnail);
        }
    },
    send_envelope: async (sprite: Sprite, channelKey: string) => {
        await new Promise(resolve => setTimeout(resolve, 0));
        if (!appState.stopSignal) {
            await broadcastEnvelope(Blockly.getMainWorkspace(), channelKey);
        }
    },
};
