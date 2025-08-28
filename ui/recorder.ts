
import { appState } from "../state.js";
import { domElements } from "./dom.js";
import { addSoundToSprite } from "./soundManager.js";

let audioContext: AudioContext | null = null;
const RECORDING_LIMIT_MS = 30000; // 30 seconds

function cleanupRecorderState() {
    const { soundRecorderState } = appState;
    if (soundRecorderState.stream) {
        soundRecorderState.stream.getTracks().forEach(track => track.stop());
    }
    if (soundRecorderState.recordedUrl) {
        URL.revokeObjectURL(soundRecorderState.recordedUrl);
    }
    if (soundRecorderState.timerIntervalId) {
        clearInterval(soundRecorderState.timerIntervalId);
    }
    if (soundRecorderState.visualizerFrameId) {
        cancelAnimationFrame(soundRecorderState.visualizerFrameId);
    }
    if (soundRecorderState.mediaRecorder && soundRecorderState.mediaRecorder.state === 'recording') {
        soundRecorderState.mediaRecorder.stop();
    }
    
    Object.assign(soundRecorderState, {
        isRecording: false, isReviewing: false, mediaRecorder: null,
        audioChunks: [], recordedBlob: null, recordedUrl: null,
        stream: null, analyser: null, visualizerFrameId: null,
        timerIntervalId: null, startTime: 0,
    });
}

function resetToInitialState() {
    cleanupRecorderState();
    domElements.recorderInitialView.classList.remove('hidden');
    domElements.recorderRecordingView.classList.add('hidden');
    domElements.recorderReviewView.classList.add('hidden');
    domElements.recordingNameInput.value = '';
    domElements.saveRecordingButton.disabled = true;
}

function closeRecorder() {
    cleanupRecorderState();
    domElements.soundRecorderModal.classList.add('hidden');
}

function openRecorder() {
    if (!appState.activeSpriteId) {
        alert("אנא בחר דמות תחילה לפני הקלטת צליל.");
        return;
    }
    resetToInitialState();
    domElements.soundRecorderModal.classList.remove('hidden');
}

function startTimer() {
    const { soundRecorderState } = appState;
    soundRecorderState.startTime = Date.now();

    soundRecorderState.timerIntervalId = window.setInterval(() => {
        const elapsed = Date.now() - soundRecorderState.startTime;
        if (elapsed >= RECORDING_LIMIT_MS) {
            stopRecording();
            return;
        }
        const totalSeconds = Math.floor(elapsed / 1000);
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        domElements.recorderTimer.textContent = `${minutes}:${seconds}`;
    }, 100);
}

function setupVisualizer() {
    const { soundRecorderState } = appState;
    if (!soundRecorderState.stream) return;
    if (!audioContext) audioContext = new AudioContext();

    soundRecorderState.analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(soundRecorderState.stream);
    source.connect(soundRecorderState.analyser);
    
    soundRecorderState.analyser.fftSize = 256;
    const bufferLength = soundRecorderState.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = domElements.recorderVisualizer;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
        if (!soundRecorderState.isRecording) return;
        soundRecorderState.visualizerFrameId = requestAnimationFrame(draw);
        soundRecorderState.analyser?.getByteFrequencyData(dataArray);
        
        ctx.fillStyle = '#f0f2f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for(let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i];
            ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
            ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
            x += barWidth + 1;
        }
    };
    draw();
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const { soundRecorderState } = appState;
        soundRecorderState.stream = stream;
        soundRecorderState.isRecording = true;
        soundRecorderState.mediaRecorder = new MediaRecorder(stream);
        soundRecorderState.mediaRecorder.start();
        startTimer();
        setupVisualizer();

        soundRecorderState.mediaRecorder.ondataavailable = event => {
            soundRecorderState.audioChunks.push(event.data);
        };

        soundRecorderState.mediaRecorder.onstop = () => {
            const audioBlob = new Blob(soundRecorderState.audioChunks, { type: 'audio/wav' });
            soundRecorderState.recordedBlob = audioBlob;
            soundRecorderState.recordedUrl = URL.createObjectURL(audioBlob);
            soundRecorderState.audioChunks = [];

            domElements.recorderRecordingView.classList.add('hidden');
            domElements.recorderReviewView.classList.remove('hidden');
            
            const sprite = appState.sprites[appState.activeSpriteId!];
            let recordingNum = 1;
            let recordingName = `הקלטה ${recordingNum}`;
            while(sprite.sounds.some(s => s.name === recordingName)) {
                recordingNum++;
                recordingName = `הקלטה ${recordingNum}`;
            }
            domElements.recordingNameInput.value = recordingName;
            domElements.saveRecordingButton.disabled = false;
        };
        
        domElements.recorderInitialView.classList.add('hidden');
        domElements.recorderRecordingView.classList.remove('hidden');

    } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("לא ניתן לגשת למיקרופון. אנא בדוק את הרשאות הדפדפן.");
        closeRecorder();
    }
}

function stopRecording() {
    const { soundRecorderState } = appState;
    if (soundRecorderState.mediaRecorder && soundRecorderState.isRecording) {
        soundRecorderState.mediaRecorder.stop();
        soundRecorderState.isRecording = false;
        if (soundRecorderState.timerIntervalId) clearInterval(soundRecorderState.timerIntervalId);
        if (soundRecorderState.visualizerFrameId) cancelAnimationFrame(soundRecorderState.visualizerFrameId);
        soundRecorderState.stream?.getTracks().forEach(track => track.stop());
    }
}

function playRecording() {
    const url = appState.soundRecorderState.recordedUrl;
    if (!url) return;
    const audio = new Audio(url);
    const playIcon = `<path d="M8 5v14l11-7z"/>`;
    const stopIcon = `<path d="M6 6h12v12H6z"/>`;
    domElements.recordingPlaybackIcon.innerHTML = stopIcon;
    audio.play();
    audio.onended = () => {
        domElements.recordingPlaybackIcon.innerHTML = playIcon;
    };
}

function handleSave() {
    const { soundRecorderState } = appState;
    const name = domElements.recordingNameInput.value.trim();
    if (name && soundRecorderState.recordedUrl) {
        addSoundToSprite({ name, url: soundRecorderState.recordedUrl });
        // Prevent revoking URL as it's now used by the sound manager
        soundRecorderState.recordedUrl = null; 
        closeRecorder();
    }
}

export function initRecorder() {
    domElements.addSoundRecordButton.addEventListener('click', openRecorder);
    domElements.closeRecorderButton.addEventListener('click', closeRecorder);
    domElements.soundRecorderModal.addEventListener('click', (e) => {
        if (e.target === domElements.soundRecorderModal) closeRecorder();
    });

    domElements.recordButton.addEventListener('click', startRecording);
    domElements.stopRecordButton.addEventListener('click', stopRecording);
    
    domElements.rerecordButton.addEventListener('click', resetToInitialState);
    domElements.playRecordingButton.addEventListener('click', playRecording);
    domElements.saveRecordingButton.addEventListener('click', handleSave);

    domElements.recordingNameInput.addEventListener('input', () => {
        domElements.saveRecordingButton.disabled = domElements.recordingNameInput.value.trim().length === 0;
    });
}