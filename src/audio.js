import * as Tone from 'tone';

const INSTRUMENTS = {
    piano: {
        urls: {
            "C4": "C4.mp3",
            "D#4": "Ds4.mp3",
            "F#4": "Fs4.mp3",
            "A4": "A4.mp3"
        },
        baseUrl: "https://tonejs.github.io/audio/salamander/"
    },
    nylon: {
        urls: {
            "E3": "E3.mp3",
            "A3": "A3.mp3",
            "D4": "D4.mp3",
            "G4": "G4.mp3"
        },
        baseUrl: "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3/"
    },
    steel: {
        urls: {
            "E3": "E3.mp3",
            "A3": "A3.mp3",
            "D4": "D4.mp3",
            "G4": "G4.mp3"
        },
        baseUrl: "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_steel-mp3/"
    },
    violin: {
        urls: {
            "G3": "G3.mp3",
            "D4": "D4.mp3",
            "A4": "A4.mp3",
            "E5": "E5.mp3"
        },
        baseUrl: "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/violin-mp3/"
    },
    cello: {
        urls: {
            "C2": "C2.mp3",
            "G2": "G2.mp3",
            "D3": "D3.mp3",
            "A3": "A3.mp3"
        },
        baseUrl: "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/cello-mp3/"
    },
    bass: {
        urls: {
            "E2": "E2.mp3",
            "A2": "A2.mp3",
            "D3": "D3.mp3",
            "G3": "G3.mp3"
        },
        baseUrl: "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_bass_finger-mp3/"
    }
};

class AudioEngine {
    constructor() {
        this.sampler = null;
        this.loaded = false;
        this.currentInstrument = 'piano';
        this.init();
    }

    async init(instrument = 'piano') {
        this.currentInstrument = instrument;
        const inst = INSTRUMENTS[instrument];
        if (!inst) return;
        if (this.sampler) {
            this.sampler.dispose();
        }
        this.loaded = false;
        this.sampler = new Tone.Sampler({
            urls: inst.urls,
            baseUrl: inst.baseUrl,
            onload: () => {
                this.loaded = true;
            }
        }).toDestination();
    }

    async setInstrument(instrument) {
        await this.init(instrument);
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