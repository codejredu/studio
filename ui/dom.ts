

export interface DomElements {
    // Containers
    spriteContainer: HTMLElement;
    speechBubbleContainer: HTMLElement;
    spriteListContainer: HTMLElement;
    stageElement: HTMLElement;
    blocklyContainer: HTMLElement;
    propertiesPanel: HTMLElement;
    
    // Buttons
    goButton: HTMLButtonElement;
    stopButton: HTMLButtonElement;
    fullscreenButton: HTMLButtonElement;
    addSpriteButton: HTMLButtonElement;
    addBackdropButton: HTMLButtonElement;
    addSoundButton: HTMLButtonElement;
    addSoundRecordButton: HTMLButtonElement;
    aiScriptButton: HTMLButtonElement;
    generateScriptButton: HTMLButtonElement;
    saveProjectButton: HTMLButtonElement;
    loadProjectButton: HTMLButtonElement;
    
    // Modals
    spriteLibraryModal: HTMLElement;
    closeLibraryButton: HTMLButtonElement;
    backdropLibraryModal: HTMLElement;
    closeBackdropLibraryButton: HTMLButtonElement;
    soundLibraryModal: HTMLElement;
    closeSoundLibraryButton: HTMLButtonElement;
    soundRecorderModal: HTMLElement;
    closeRecorderButton: HTMLButtonElement;
    aiScriptModal: HTMLElement;
    closeAiModalButton: HTMLButtonElement;
    gifEditorModal: HTMLElement;
    closeGifEditorButton: HTMLButtonElement;
    aiSpriteGeneratorModal: HTMLElement;
    closeAiGeneratorButton: HTMLButtonElement;

    // Library Grids
    spriteGrid: HTMLElement;
    backdropGrid: HTMLElement;
    soundGrid: HTMLElement;
    
    // Uploads
    uploadSpriteButton: HTMLButtonElement;
    uploadSpriteInput: HTMLInputElement;
    uploadBackdropButton: HTMLButtonElement;
    uploadBackdropInput: HTMLInputElement;
    loadProjectInput: HTMLInputElement;
    
    // Sound List
    soundListContainer: HTMLElement;
    backdropThumbnailList: HTMLElement;
    
    // Sound Recorder
    recorderInitialView: HTMLElement;
    recorderRecordingView: HTMLElement;
    recorderReviewView: HTMLElement;
    recordButton: HTMLButtonElement;
    stopRecordButton: HTMLButtonElement;
    recorderTimer: HTMLElement;
    recorderVisualizer: HTMLCanvasElement;
    playRecordingButton: HTMLButtonElement;
    rerecordButton: HTMLButtonElement;
    saveRecordingButton: HTMLButtonElement;
    recordingNameInput: HTMLInputElement;
    recordingPlaybackIcon: SVGElement;

    // AI Script Modal
    aiPromptTextarea: HTMLTextAreaElement;
    aiSpinner: HTMLElement;

    // AI Sprite Generator
    aiCreateSpriteButton: HTMLButtonElement;
    aiSpritePromptTextarea: HTMLTextAreaElement;
    aiSpritePreviewContainer: HTMLElement;
    aiSpriteGeneratorSpinner: HTMLElement;
    aiSpritePreviewImage: HTMLImageElement;
    addGeneratedSpriteButton: HTMLButtonElement;
    generateSpriteButton: HTMLButtonElement;
    removeBackgroundButton: HTMLButtonElement;

    // GIF Editor
    gifPreviewCanvas: HTMLCanvasElement;
    gifSpeedSlider: HTMLInputElement;
    gifSpeedValue: HTMLElement;
    gifEditorSpinner: HTMLElement;

    // Properties Panel
    spriteNameInput: HTMLInputElement;
    spriteXSlider: HTMLInputElement;
    spriteXNum: HTMLInputElement;
    spriteYSlider: HTMLInputElement;
    spriteYNum: HTMLInputElement;
    spriteSizeSlider: HTMLInputElement;
    spriteSizeNum: HTMLInputElement;
    spriteHueSlider: HTMLInputElement;
    spriteHueNum: HTMLInputElement;
    directionDial: HTMLElement;
    directionDialHandlePivot: HTMLElement;
    spriteDirectionNum: HTMLInputElement;
    directionStepUpButton: HTMLButtonElement;
    directionStepDownButton: HTMLButtonElement;
    spriteShowCheckbox: HTMLInputElement;
    rotationStyleControls: HTMLElement;
    
    // Number Pad
    numberPadModal: HTMLElement;
    numpadBackdrop: HTMLElement;
    numberPadDisplay: HTMLElement;
    numberPadGrid: HTMLElement;
    numPadOkButton: HTMLButtonElement;
    numPadBackspaceButton: HTMLButtonElement;
    numPadClearButton: HTMLButtonElement;
    numPadSignButton: HTMLButtonElement;

    // Direction Editor Popover
    directionEditorPopover: HTMLElement;
    directionEditorBackdrop: HTMLElement;
    directionEditorDisplay: HTMLElement;
    directionEditorDial: HTMLElement;
    directionEditorDialHandle: HTMLElement;
    directionEditorUpButton: HTMLButtonElement;
    directionEditorDownButton: HTMLButtonElement;
    directionEditorOkButton: HTMLButtonElement;

    // Color Picker
    colorPickerOverlay: HTMLElement;
    colorPickerMagnifier: HTMLElement;
    colorPalettePopover: HTMLElement;
    colorPaletteBackdrop: HTMLElement;
    colorPaletteGrid: HTMLElement;
    colorPaletteEyedropper: HTMLButtonElement;
}

export let domElements: DomElements;

export function initDomElements(): void {
    domElements = {
        spriteContainer: document.getElementById('sprite-container')!,
        speechBubbleContainer: document.getElementById('speech-bubble-container')!,
        spriteListContainer: document.getElementById('sprite-list')!,
        stageElement: document.getElementById('stage')!,
        blocklyContainer: document.getElementById('blockly-container')!,
        propertiesPanel: document.getElementById('properties-panel')!,
        
        goButton: document.getElementById('go-button') as HTMLButtonElement,
        stopButton: document.getElementById('stop-button') as HTMLButtonElement,
        fullscreenButton: document.getElementById('fullscreen-button') as HTMLButtonElement,
        addSpriteButton: document.getElementById('add-sprite-button') as HTMLButtonElement,
        addBackdropButton: document.getElementById('add-backdrop-button') as HTMLButtonElement,
        addSoundButton: document.getElementById('add-sound-button') as HTMLButtonElement,
        addSoundRecordButton: document.getElementById('add-sound-record-button') as HTMLButtonElement,
        aiScriptButton: document.getElementById('ai-script-button') as HTMLButtonElement,
        generateScriptButton: document.getElementById('generate-script-button') as HTMLButtonElement,
        saveProjectButton: document.getElementById('save-project-button') as HTMLButtonElement,
        loadProjectButton: document.getElementById('load-project-button') as HTMLButtonElement,

        spriteLibraryModal: document.getElementById('sprite-library-modal')!,
        closeLibraryButton: document.getElementById('close-library-button') as HTMLButtonElement,
        backdropLibraryModal: document.getElementById('backdrop-library-modal')!,
        closeBackdropLibraryButton: document.getElementById('close-backdrop-library-button') as HTMLButtonElement,
        soundLibraryModal: document.getElementById('sound-library-modal')!,
        closeSoundLibraryButton: document.getElementById('close-sound-library-button') as HTMLButtonElement,
        soundRecorderModal: document.getElementById('sound-recorder-modal')!,
        closeRecorderButton: document.getElementById('close-recorder-button') as HTMLButtonElement,
        aiScriptModal: document.getElementById('ai-script-modal')!,
        closeAiModalButton: document.getElementById('close-ai-modal-button') as HTMLButtonElement,
        gifEditorModal: document.getElementById('gif-editor-modal')!,
        closeGifEditorButton: document.getElementById('close-gif-editor-button') as HTMLButtonElement,
        aiSpriteGeneratorModal: document.getElementById('ai-sprite-generator-modal')!,
        closeAiGeneratorButton: document.getElementById('close-ai-generator-button') as HTMLButtonElement,
        
        spriteGrid: document.getElementById('sprite-grid')!,
        backdropGrid: document.getElementById('backdrop-grid')!,
        soundGrid: document.getElementById('sound-grid')!,
        
        uploadSpriteButton: document.getElementById('upload-sprite-button') as HTMLButtonElement,
        uploadSpriteInput: document.getElementById('upload-sprite-input') as HTMLInputElement,
        uploadBackdropButton: document.getElementById('upload-backdrop-button') as HTMLButtonElement,
        uploadBackdropInput: document.getElementById('upload-backdrop-input') as HTMLInputElement,
        loadProjectInput: document.getElementById('load-project-input') as HTMLInputElement,
        
        soundListContainer: document.getElementById('sound-list')!,
        backdropThumbnailList: document.getElementById('backdrop-thumbnail-list')!,
        
        recorderInitialView: document.getElementById('recorder-initial-view')!,
        recorderRecordingView: document.getElementById('recorder-recording-view')!,
        recorderReviewView: document.getElementById('recorder-review-view')!,
        recordButton: document.getElementById('record-button') as HTMLButtonElement,
        stopRecordButton: document.getElementById('stop-record-button') as HTMLButtonElement,
        recorderTimer: document.getElementById('recorder-timer')!,
        recorderVisualizer: document.getElementById('recorder-visualizer') as HTMLCanvasElement,
        playRecordingButton: document.getElementById('play-recording-button') as HTMLButtonElement,
        rerecordButton: document.getElementById('rerecord-button') as HTMLButtonElement,
        saveRecordingButton: document.getElementById('save-recording-button') as HTMLButtonElement,
        recordingNameInput: document.getElementById('recording-name-input') as HTMLInputElement,
        recordingPlaybackIcon: document.getElementById('recording-playback-icon') as unknown as SVGElement,

        aiPromptTextarea: document.getElementById('ai-prompt-textarea') as HTMLTextAreaElement,
        aiSpinner: document.getElementById('ai-spinner')!,

        aiCreateSpriteButton: document.getElementById('ai-create-sprite-button') as HTMLButtonElement,
        aiSpritePromptTextarea: document.getElementById('ai-sprite-prompt-textarea') as HTMLTextAreaElement,
        aiSpritePreviewContainer: document.getElementById('ai-sprite-preview-container')!,
        aiSpriteGeneratorSpinner: document.getElementById('ai-sprite-generator-spinner')!,
        aiSpritePreviewImage: document.getElementById('ai-sprite-preview-image') as HTMLImageElement,
        addGeneratedSpriteButton: document.getElementById('add-generated-sprite-button') as HTMLButtonElement,
        generateSpriteButton: document.getElementById('generate-sprite-button') as HTMLButtonElement,
        removeBackgroundButton: document.getElementById('remove-background-button') as HTMLButtonElement,

        gifPreviewCanvas: document.getElementById('gif-preview-canvas') as HTMLCanvasElement,
        gifSpeedSlider: document.getElementById('gif-speed-slider') as HTMLInputElement,
        gifSpeedValue: document.getElementById('gif-speed-value')!,
        gifEditorSpinner: document.getElementById('gif-editor-spinner')!,

        spriteNameInput: document.getElementById('sprite-name-input') as HTMLInputElement,
        spriteXSlider: document.getElementById('sprite-x-slider') as HTMLInputElement,
        spriteXNum: document.getElementById('sprite-x-num') as HTMLInputElement,
        spriteYSlider: document.getElementById('sprite-y-slider') as HTMLInputElement,
        spriteYNum: document.getElementById('sprite-y-num') as HTMLInputElement,
        spriteSizeSlider: document.getElementById('sprite-size-slider') as HTMLInputElement,
        spriteSizeNum: document.getElementById('sprite-size-num') as HTMLInputElement,
        spriteHueSlider: document.getElementById('sprite-hue-slider') as HTMLInputElement,
        spriteHueNum: document.getElementById('sprite-hue-num') as HTMLInputElement,
        directionDial: document.getElementById('direction-dial')!,
        directionDialHandlePivot: document.getElementById('direction-dial-handle-pivot')!,
        spriteDirectionNum: document.getElementById('sprite-direction-num') as HTMLInputElement,
        directionStepUpButton: document.getElementById('direction-step-up') as HTMLButtonElement,
        directionStepDownButton: document.getElementById('direction-step-down') as HTMLButtonElement,
        spriteShowCheckbox: document.getElementById('sprite-show-checkbox') as HTMLInputElement,
        rotationStyleControls: document.getElementById('rotation-style-controls')!,
        
        numberPadModal: document.getElementById('number-pad-modal')!,
        numpadBackdrop: document.getElementById('numpad-backdrop')!,
        numberPadDisplay: document.getElementById('number-pad-display')!,
        numberPadGrid: document.getElementById('number-pad-grid')!,
        numPadOkButton: document.getElementById('num-pad-ok') as HTMLButtonElement,
        numPadBackspaceButton: document.getElementById('num-pad-backspace') as HTMLButtonElement,
        numPadClearButton: document.getElementById('num-pad-clear') as HTMLButtonElement,
        numPadSignButton: document.getElementById('num-pad-sign') as HTMLButtonElement,

        directionEditorPopover: document.getElementById('direction-editor-popover')!,
        directionEditorBackdrop: document.getElementById('direction-editor-backdrop')!,
        directionEditorDisplay: document.getElementById('direction-editor-display')!,
        directionEditorDial: document.getElementById('direction-editor-dial')!,
        directionEditorDialHandle: document.getElementById('direction-editor-dial-handle')!,
        directionEditorUpButton: document.getElementById('direction-editor-up') as HTMLButtonElement,
        directionEditorDownButton: document.getElementById('direction-editor-down') as HTMLButtonElement,
        directionEditorOkButton: document.getElementById('direction-editor-ok') as HTMLButtonElement,

        colorPickerOverlay: document.getElementById('color-picker-overlay')!,
        colorPickerMagnifier: document.getElementById('color-picker-magnifier')!,
        colorPalettePopover: document.getElementById('color-palette-popover')!,
        colorPaletteBackdrop: document.getElementById('color-palette-backdrop')!,
        colorPaletteGrid: document.getElementById('color-palette-grid')!,
        colorPaletteEyedropper: document.getElementById('color-palette-eyedropper') as HTMLButtonElement,
    };
}
