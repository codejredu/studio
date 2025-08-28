

import { appState } from '../state.js';
import { handleBlockClick, compileColorTriggers } from '../runtime/engine.js';
import { defineBlocks } from './blocks.js';
import { CustomFieldAngle, CustomFieldNumber, FieldColorPicker } from './custom_fields.js';
import { CustomCategory, ToolboxLabel } from './custom_toolbox.js';
import { defineGenerators } from './generator.js';
import { domElements } from '../ui/dom.js';
import { updateMoveBlockIcon } from '../ui/rendering.js';

declare var Blockly: any;

// --- Custom Renderer for larger input fields and min block width ---
class CustomConstantProvider extends Blockly.zelos.ConstantProvider {
    constructor() {
        super();
        this.MIN_BLOCK_WIDTH = 150;
        this.FIELD_HORIZONTAL_PADDING = 10;
        this.FIELD_VERTICAL_PADDING = 12;
        this.FIELD_BORDER_RECT_RADIUS = 6;
    }
}

class CustomZelosRenderer extends Blockly.zelos.Renderer {
    constructor() {
        super('custom_zelos');
    }
    makeConstants_() {
        return new CustomConstantProvider();
    }
}

// --- Flyout Fix Functions ---
function fixFlyoutDisplay() {
    setTimeout(() => {
        const flyout = document.querySelector('.blocklyFlyout');
        if (flyout) {
            (flyout as HTMLElement).style.visibility = 'visible';
            (flyout as HTMLElement).style.display = 'block';
            (flyout as HTMLElement).style.width = 'auto';
            (flyout as HTMLElement).style.minWidth = '250px';
            (flyout as HTMLElement).style.height = '100%';
            (flyout as HTMLElement).style.overflowY = 'auto';
            (flyout as HTMLElement).style.overflowX = 'visible';
            (flyout as HTMLElement).style.zIndex = '10';
            
            const flyoutBg = flyout.querySelector('.blocklyFlyoutBackground');
            if (flyoutBg) {
                (flyoutBg as any).setAttribute('fill', '#F9F9F9');
                (flyoutBg as any).setAttribute('fill-opacity', '1');
            }
            
            const blockCanvas = flyout.querySelector('.blocklyBlockCanvas');
            if (blockCanvas) {
                (blockCanvas as HTMLElement).style.visibility = 'visible';
                (blockCanvas as HTMLElement).style.display = 'block';
                
                const blocks = blockCanvas.querySelectorAll('g[data-block-id]');
                blocks.forEach(block => {
                    (block as SVGElement).style.visibility = 'visible';
                    (block as SVGElement).style.display = 'block';
                });
            }
            
            const texts = flyout.querySelectorAll('text');
            texts.forEach(text => {
                (text as any).setAttribute('fill', '#333');
                (text as SVGElement).style.visibility = 'visible';
            });
        }
    }, 100);
}

function fixFlyoutPosition() {
    const toolbox = document.querySelector('.blocklyToolboxDiv');
    const flyout = document.querySelector('.blocklyFlyout');
    
    if (toolbox && flyout) {
        const toolboxRect = toolbox.getBoundingClientRect();
        const flyoutEl = flyout as HTMLElement;
        flyoutEl.style.right = `${toolboxRect.width}px`;
        flyoutEl.style.left = 'auto';
        flyoutEl.style.maxWidth = '300px';
    }
}

function fixToolboxSpacingWithFlyout() {
    setTimeout(() => {
        const toolboxDiv = document.querySelector('.blocklyToolboxDiv');
        if (toolboxDiv) {
            (toolboxDiv as HTMLElement).style.minWidth = '120px';
            (toolboxDiv as HTMLElement).style.overflow = 'visible';
        }

        const rows = document.querySelectorAll('.blocklyTreeRow');
        rows.forEach(row => {
            const htmlRow = row as HTMLElement;
            htmlRow.style.minHeight = '120px';
            htmlRow.style.height = '120px';
            htmlRow.style.marginBottom = '4px';
            htmlRow.style.padding = '12px 8px';
            htmlRow.style.boxSizing = 'border-box';
        });

        const icons = document.querySelectorAll('.category-icon');
        icons.forEach(icon => {
            const htmlIcon = icon as HTMLElement;
            htmlIcon.style.width = '48px';
            htmlIcon.style.height = '48px';
            htmlIcon.style.marginBottom = '6px';
            htmlIcon.style.flexShrink = '0';
        });

        const svgs = document.querySelectorAll('.category-icon svg');
        svgs.forEach(svg => {
            const svgEl = svg as SVGElement;
            svgEl.style.width = '28px';
            svgEl.style.height = '28px';
        });

        const labels = document.querySelectorAll('.blocklyTreeLabel');
        labels.forEach(label => {
            const htmlLabel = label as HTMLElement;
            htmlLabel.style.fontSize = '12px';
            htmlLabel.style.lineHeight = '1.2';
            htmlLabel.style.maxWidth = '80px';
            htmlLabel.style.wordWrap = 'break-word';
            htmlLabel.style.marginTop = '2px';
        });

        const flyout = document.querySelector('.blocklyFlyout');
        if (flyout) {
            (flyout as HTMLElement).style.visibility = 'hidden';
        }
    }, 500);
}

function setupBlocklyEventListeners(workspace: any) {
    let colorTriggerDebounceTimer: number;

    workspace.addChangeListener((event: any) => {
        // Only save workspace if it's a real change and not during a background execution or sprite drag
        if (!event.isUiEvent && event.type !== Blockly.Events.VIEWPORT_CHANGE && event.type !== Blockly.Events.THEME_CHANGE && !appState.isExecutingInBackground && !appState.isDraggingSprite) {
            if (appState.activeSpriteId && appState.sprites[appState.activeSpriteId]) {
                appState.sprites[appState.activeSpriteId].workspaceState = Blockly.serialization.workspaces.save(workspace);
            }
        }

        if (event.type === Blockly.Events.TOOLBOX_ITEM_SELECT) {
            if (event.newItem) {
                setTimeout(() => {
                    fixFlyoutDisplay();
                    fixFlyoutPosition();
                }, 50);
            } else {
                const flyout = document.querySelector('.blocklyFlyout');
                if (flyout) {
                    (flyout as HTMLElement).style.visibility = 'hidden';
                }
            }
        }

        if (event.type === Blockly.Events.CLICK && event.blockId && event.element !== 'workspace') {
            const block = workspace.getBlockById(event.blockId);

            if (!block || block.isInFlyout || block.getInheritedDisabled() || block.outputConnection) {
                return;
            }

            if (!appState.isExecutingOnDemand) {
                handleBlockClick(block);
            }
        }

        // Re-compile color triggers on any meaningful workspace change.
        if (event.type === Blockly.Events.CREATE ||
            event.type === Blockly.Events.DELETE ||
            event.type === Blockly.Events.CHANGE ||
            event.type === Blockly.Events.MOVE) {
            
            clearTimeout(colorTriggerDebounceTimer);
            colorTriggerDebounceTimer = window.setTimeout(() => {
                compileColorTriggers();
            }, 250);
        }
    });
}

const toolbox = {
    'kind': 'categoryToolbox',
    'contents': [
        { 'kind': 'toolboxlabel', 'name': 'קטגוריות' },
        {
            'kind': 'category', 'name': 'אירועים', 'categorystyle': 'events_category', 'icon_key': 'events',
            'contents': [
                { 'kind': 'block', 'type': 'event_when_go_clicked' },
                { 'kind': 'block', 'type': 'event_when_this_sprite_clicked' },
                { 'kind': 'block', 'type': 'event_when_key_pressed' },
                { 'kind': 'block', 'type': 'event_when_bumping_sprite' },
                { 'kind': 'block', 'type': 'event_when_color_under' },
                { 'kind': 'block', 'type': 'event_send_envelope' },
                { 'kind': 'block', 'type': 'event_when_envelope_received' },
            ]
        },
        {
            'kind': 'category', 'name': 'בקרה', 'categorystyle': 'control_category', 'icon_key': 'control',
            'contents': [
                { 'kind': 'block', 'type': 'control_wait' },
                { 'kind': 'block', 'type': 'control_repeat' },
                { 'kind': 'block', 'type': 'control_forever' },
                { 'kind': 'block', 'type': 'control_stop' },
            ]
        },
        {
            'kind': 'category', 'name': 'תנועה', 'categorystyle': 'motion_category', 'icon_key': 'motion',
            'contents': [
                { 'kind': 'block', 'type': 'motion_movesteps' },
                { 'kind': 'block', 'type': 'motion_turnright' },
                { 'kind': 'block', 'type': 'motion_turnleft' },
                { 'kind': 'block', 'type': 'motion_setheading' },
                { 'kind': 'block', 'type': 'motion_hop' },
            ]
        },
        {
            'kind': 'category', 'name': 'מראה', 'categorystyle': 'looks_category', 'icon_key': 'looks',
            'contents': [
                { 'kind': 'block', 'type': 'looks_sayforsecs' },
                { 'kind': 'block', 'type': 'looks_say' },
                { 'kind': 'block', 'type': 'looks_changesizeby' },
                { 'kind': 'block', 'type': 'looks_shrinkby' },
                { 'kind': 'block', 'type': 'looks_setsizeto' },
                { 'kind': 'block', 'type': 'looks_show' },
                { 'kind': 'block', 'type': 'looks_hide' },
                { 'kind': 'block', 'type': 'looks_switchbackdrop' },
            ]
        },
        {
            'kind': 'category', 'name': 'צליל', 'categorystyle': 'sound_category', 'icon_key': 'sound',
            'contents': [
                { 'kind': 'block', 'type': 'sound_playuntildone' },
                { 'kind': 'block', 'type': 'sound_play' },
                { 'kind': 'block', 'type': 'sound_stopallsounds' },
            ]
        }
    ]
};

export function refreshSpriteDropdowns(workspace: any) {
    if (!workspace) return;
    workspace.getAllBlocks(false).forEach((block: any) => {
        if (block.type === 'event_when_bumping_sprite') {
            const dropdown = block.getField('SPRITE_TARGET');
            if (dropdown) {
                const currentValue = dropdown.getValue();
                dropdown.getOptions(false);
                const newOptions = dropdown.getOptions(false);
                if (newOptions.some((opt: any) => opt[1] === currentValue)) {
                    dropdown.setValue(currentValue);
                }
            }
        }
    });
}

export function refreshBackdropDropdowns(workspace: any) {
    if (!workspace) return;
    workspace.getAllBlocks(false).forEach((block: any) => {
        if (block.type === 'looks_switchbackdrop') {
            const dropdown = block.getField('BACKDROP');
            if (dropdown) {
                const currentValue = dropdown.getValue();
                dropdown.getOptions(false);
                const newOptions = dropdown.getOptions(false);
                if (newOptions.some((opt: any) => opt[1] === currentValue)) {
                    dropdown.setValue(currentValue);
                }
            }
        }
    });
}


export function initBlockly() {
    // Register custom components
    Blockly.registry.register(Blockly.registry.Type.TOOLBOX_ITEM, 'toolboxlabel', ToolboxLabel, true);
    Blockly.registry.register(Blockly.registry.Type.TOOLBOX_ITEM, 'category', CustomCategory, true);
    Blockly.fieldRegistry.register('custom_field_number', CustomFieldNumber);
    Blockly.fieldRegistry.register('custom_field_angle', CustomFieldAngle);
    Blockly.fieldRegistry.register('field_color_picker', FieldColorPicker);
    Blockly.blockRendering.register('custom_zelos', CustomZelosRenderer);

    // Define theme
    const motionCategoryStyle = { 'colour': '#4C97FF' };
    const looksCategoryStyle = { 'colour': '#9966FF' };
    const soundCategoryStyle = { 'colour': '#D65CD6' };
    const eventsCategoryStyle = { 'colour': '#FFBF00' };
    const controlCategoryStyle = { 'colour': '#FFAB19' };

    Blockly.Themes.Scratch = Blockly.Theme.defineTheme('scratch_theme', {
        'base': Blockly.Themes.Zelos,
        'categoryStyles': {
            'motion_category': motionCategoryStyle,
            'looks_category': looksCategoryStyle,
            'sound_category': soundCategoryStyle,
            'events_category': eventsCategoryStyle,
            'control_category': controlCategoryStyle,
        },
        'blockStyles': {
            'motion_blocks': { 'colourPrimary': '#4C97FF', 'colourTertiary': '#3373CC' },
            'looks_blocks': { 'colourPrimary': '#9966FF', 'colourTertiary': '#774DCB' },
            'sound_blocks': { 'colourPrimary': '#D65CD6', 'colourTertiary': '#C442C4' },
            'events_blocks': { 'colourPrimary': '#FFBF00', 'colourTertiary': '#E6AC00' },
            'control_blocks': { 'colourPrimary': '#FFAB19', 'colourTertiary': '#CF8B17' },
        },
        'componentStyles': {
            'dropdown': { 'backgroundColor': '#f3ebeb', 'fontColor': '#000000', 'borderColor': '#cccccc' }
        },
        'fontStyle': { 'family': 'inherit', 'weight': 'bold', 'size': 16 }
    });

    // Define blocks and generators
    defineBlocks();
    defineGenerators();

    // Inject workspace
    const workspace = Blockly.inject(domElements.blocklyContainer, {
        toolbox: toolbox,
        renderer: 'custom_zelos',
        theme: Blockly.Themes.Scratch,
        rtl: true,
        grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
        zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
        trashcan: true,
    });
    
    // Final setup
    fixToolboxSpacingWithFlyout();
    setupBlocklyEventListeners(workspace);
    updateMoveBlockIcon(workspace);
    
    return workspace;
}