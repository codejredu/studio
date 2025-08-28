
import { initBlockly, refreshBackdropDropdowns, refreshSpriteDropdowns } from './blockly/setup.js';
import { BACKDROP_LIBRARY, SPRITE_LIBRARY } from './data.js';
import { gameLoop } from './runtime/engine.js';
import { addBackdropToProject } from './ui/backdropManager.js';
import { initDomElements } from './ui/dom.js';
import { initUI } from './ui/main.js';
import { addNewSprite } from './ui/spriteManager.js';
import { initDetectionCanvas } from './runtime/colorDetection.js';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

document.addEventListener('DOMContentLoaded', () => {
    // 0. Get all DOM element references once the DOM is ready.
    initDomElements();
    initDetectionCanvas(); // For the "when color under" block

    // 1. Initialize the Blockly workspace FIRST, as the UI depends on it.
    const workspace = initBlockly();

    // 2. Initialize all UI components and event listeners
    initUI();
    
    // 3. Initialize the default scene
    if (BACKDROP_LIBRARY.length > 0) { 
        addBackdropToProject(BACKDROP_LIBRARY[0]); 
    }
    addNewSprite(SPRITE_LIBRARY[0].url, SPRITE_LIBRARY[0].name);

    // 4. Start the main application loop
    gameLoop(0);

    // Initial refresh of dynamic dropdowns
    refreshSpriteDropdowns(workspace);
    refreshBackdropDropdowns(workspace);
});