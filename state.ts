// --- State Management and Type Definitions ---
export interface SpriteState {
    x: number; y: number; angle: number; size: number; visible: boolean; imageUrl: string;
    rotationStyle: 'all-around' | 'left-right' | 'none';
    animationSpeed: number;
    hue: number;
}
export interface Sound { name: string; url: string; }
export interface Backdrop { url: string; name: string; }
export interface Command {
    type: string;
    args: string[];
    substack?: Command[];
    blockId?: string;
    blockType?: string;
}

export interface SpriteGifData {
    frames: any[]; width: number; height: number; backgroundColor: string | null;
    currentFrameIndex: number; accumulator: number;
    canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D;
    fullFrameCanvas: HTMLCanvasElement; fullFrameCtx: CanvasRenderingContext2D;
    patchCanvas: HTMLCanvasElement; patchCtx: CanvasRenderingContext2D;
    previousImageData: ImageData | null;
}

export interface Sprite {
    id: string; name: string; domElement: HTMLElement; speechBubbleElement: HTMLElement;
    state: SpriteState;
    sounds: Sound[];
    workspaceState: any;
    isGif: boolean;
    gifData?: SpriteGifData;
    _isWrapping?: boolean; // Internal flag for edge wrapping
    isDirty: boolean; // Flag for rendering optimization
}

// A type for the serializable sprite data
export interface SerializableSpriteData {
    id: string; name: string; state: SpriteState; sounds: Sound[];
    workspaceState: any; isGif: boolean;
}

// A type for the entire project file
export interface ProjectData {
    sprites: Record<string, SerializableSpriteData>;
    stageBackdrops: Backdrop[];
    activeBackdropUrl: string | null;
    nextSpriteId: number;
    activeSpriteId: string | null;
}

// Type for the pre-parsed color triggers
export interface ColorTrigger {
    spriteId: string;
    blockId: string;
    targetColorRgb: [number, number, number];
    substack: Command[];
    isTouching: boolean;
}

interface AppState {
    sprites: Record<string, Sprite>;
    activeSpriteId: string | null;
    stageSelectedSpriteId: string | null; // New: Tracks the sprite selected directly on the stage
    nextSpriteId: number;
    stageBackdrops: Backdrop[];
    activeBackdropUrl: string | null;
    isRunning: boolean;
    stopSignal: boolean;
    isExecutingOnDemand: boolean; // Flag for any non-"green flag" script (click, key press, etc.)
    isEventDrivenExecution: boolean; // Flag to indicate if the current script was started by an event block
    isExecutingKeyPress: boolean;
    isExecutingInBackground: boolean; // Flag to prevent saving workspace during temp context switches
    isDraggingSprite: boolean; // Flag to prevent saving workspace during sprite drag
    activeBumpScripts: Map<string, symbol>;
    activeColorTouchScripts: Map<string, boolean>;
    colorTriggers: ColorTrigger[]; // For the "when color under" block
    currentlyPlayingSounds: HTMLAudioElement[];
    draggingInfo: {
        spriteId: string | null;
        startX: number;
        startY: number;
        spriteStartX: number;
        spriteStartY: number;
        moved: boolean;
    };
    isDialDragging: boolean;
    currentNumberPadValue: string;
    activeField: any;
    editingAnimationSpriteId: string | null;
    gifEditorState: {
        frames: any[];
        isPlaying: boolean;
        currentFrameIndex: number;
        animationTimeoutId: number | null;
        fullFrame: CanvasRenderingContext2D | null;
        previousImageData: ImageData | null;
        backgroundColor: string | null;
        patchCanvas: HTMLCanvasElement;
        patchCtx: CanvasRenderingContext2D | null;
    };
    lastFrameTimestamp: number;
    soundRecorderState: {
        isRecording: boolean;
        isReviewing: boolean;
        mediaRecorder: MediaRecorder | null;
        audioChunks: Blob[];
        recordedBlob: Blob | null;
        recordedUrl: string | null;
        stream: MediaStream | null;
        analyser: AnalyserNode | null;
        visualizerFrameId: number | null;
        timerIntervalId: number | null;
        startTime: number;
    };
    aiSpriteGeneratorState: {
        generatedImageUrl: string | null;
        lastPrompt: string | null;
    };
    eventBlockGuard: Set<string>; // Prevents double-execution of blocks from a single event
}

// Centralized application state
export const appState: AppState = {
    sprites: {},
    activeSpriteId: null,
    stageSelectedSpriteId: null, // New: Initialize to null
    nextSpriteId: 1,

    stageBackdrops: [],
    activeBackdropUrl: null,
    
    isRunning: false,
    stopSignal: false,
    isExecutingOnDemand: false, 
    isEventDrivenExecution: false,
    isExecutingKeyPress: false,
    isExecutingInBackground: false,
    isDraggingSprite: false,
    activeBumpScripts: new Map<string, symbol>(),
    activeColorTouchScripts: new Map<string, boolean>(),
    colorTriggers: [],
    currentlyPlayingSounds: [],
    
    // UI Interaction State
    draggingInfo: { spriteId: null, startX: 0, startY: 0, spriteStartX: 0, spriteStartY: 0, moved: false },
    isDialDragging: false,
    
    // Number Pad State
    currentNumberPadValue: '',
    activeField: null,
    
    // GIF Editor State
    editingAnimationSpriteId: null,
    gifEditorState: {
        frames: [],
        isPlaying: false,
        currentFrameIndex: 0,
        animationTimeoutId: null,
        fullFrame: null,
        previousImageData: null,
        backgroundColor: null,
        patchCanvas: document.createElement('canvas'),
        patchCtx: null,
    },
    
    // Game Loop Timing
    lastFrameTimestamp: 0,

    // Sound Recorder State
    soundRecorderState: {
        isRecording: false,
        isReviewing: false,
        mediaRecorder: null,
        audioChunks: [],
        recordedBlob: null,
        recordedUrl: null,
        stream: null,
        analyser: null,
        visualizerFrameId: null,
        timerIntervalId: null,
        startTime: 0,
    },

    // AI Sprite Generator State
    aiSpriteGeneratorState: {
        generatedImageUrl: null,
        lastPrompt: null,
    },
    
    eventBlockGuard: new Set(),
};

// Initialize canvas contexts that require it
appState.gifEditorState.patchCtx = appState.gifEditorState.patchCanvas.getContext('2d', { willReadFrequently: true });
if (appState.gifEditorState.patchCtx) {
    appState.gifEditorState.patchCtx.imageSmoothingEnabled = false;
}