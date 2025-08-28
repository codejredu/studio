
declare var Blockly: any;

export const ICONS = {
    motion: `<svg viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>`,
    looks: `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`,
    sound: `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
    events: `<svg viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>`,
    control: `<svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>`,
};

export class ToolboxLabel extends Blockly.ToolboxItem {
    private htmlDiv_: HTMLDivElement | null = null;
    constructor(toolboxItemDef: any, parentToolbox: any) {
        super(toolboxItemDef, parentToolbox);
    }
    init() {
        this.htmlDiv_ = document.createElement('div');
        this.htmlDiv_.className = 'toolbox-label';
        this.htmlDiv_.textContent = this.toolboxItemDef_['name'];
    }
    getDiv() {
        return this.htmlDiv_;
    }
}

export class CustomCategory extends Blockly.ToolboxCategory {
    private iconKey_: string;

    constructor(categoryDef: any, toolbox: any, opt_parent: any) {
        super(categoryDef, toolbox, opt_parent);
        this.iconKey_ = this.toolboxItemDef_['icon_key'];
        (this as any).rowHeight_ = 120;
    }

    createIconDom_() {
        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'category-icon';
        if (this.iconKey_ && (ICONS as any)[this.iconKey_]) {
            iconWrapper.innerHTML = (ICONS as any)[this.iconKey_];
        }
        return iconWrapper;
    }

    addColourBorder_(colour: string) {
        const icon = this.rowDiv_.querySelector('.category-icon');
        if (icon instanceof HTMLElement) {
            icon.style.backgroundColor = colour;
            this.rowDiv_.style.setProperty('--category-colour', colour);
        }
    }

    setSelected(isSelected: boolean) {
        super.setSelected(isSelected);
        if (isSelected) {
            this.rowDiv_.classList.add('category-selected');
        } else {
            this.rowDiv_.classList.remove('category-selected');
        }
    }

    createRowContainer_() {
        const container = super.createRowContainer_();
        if (container) {
            container.style.minHeight = '120px';
            container.style.height = '120px';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.boxSizing = 'border-box';
        }
        return container;
    }
}
