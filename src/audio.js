import * as Tone from 'tone';

class AudioEngine {
    constructor() {
        this.sampler = null;
        this.loaded = false;
        this.init();
    }

    async init() {
        // Cargar un sampler de piano por defecto
        this.sampler = new Tone.Sampler({
            urls: {
                "C4": "C4.mp3",
                "D#4": "Ds4.mp3",
                "F#4": "Fs4.mp3",
                "A4": "A4.mp3"
            },
            baseUrl: "https://tonejs.github.io/audio/salamander/",
            onload: () => {
                this.loaded = true;
            }
        }).toDestination();
    }

    async resumeContext() {
        if (Tone.context.state !== 'running') {
            await Tone.start();
        }
    }

    playNote(note, duration = '8n') {
        if (this.loaded && this.sampler) {
            this.sampler.triggerAttackRelease(note, duration);
        }
    }
}

export const audioEngine = new AudioEngine();
