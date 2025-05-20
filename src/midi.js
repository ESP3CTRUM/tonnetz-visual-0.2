import MidiParser from 'midi-parser-js';

class MidiManager {
    constructor() {
        this.events = [];
        this.tempo = 120;
        this.ticksPerBeat = 480;
    }

    parse(arrayBuffer) {
        const midi = MidiParser.parse(arrayBuffer);
        this.events = [];
        this.tempo = 120;
        this.ticksPerBeat = midi.timeDivision || 480;

        // Buscar tempo si existe
        for (const track of midi.track) {
            for (const event of track.event) {
                if (event.metaType === 0x51) {
                    // Tempo en microsegundos por negra
                    const mpqn = (event.data[0] << 16) | (event.data[1] << 8) | event.data[2];
                    this.tempo = Math.round(60000000 / mpqn);
                }
            }
        }

        // Extraer eventos de nota
        for (const track of midi.track) {
            let currentTime = 0;
            for (const event of track.event) {
                currentTime += event.deltaTime;
                if (event.type === 9 && event.data[1] > 0) { // noteOn
                    this.events.push({
                        type: 'noteOn',
                        note: event.data[0],
                        velocity: event.data[1],
                        time: currentTime
                    });
                }
            }
        }
    }

    getNoteEvents() {
        return this.events;
    }

    getTempo() {
        return this.tempo;
    }

    getTicksPerBeat() {
        return this.ticksPerBeat;
    }
}

export const midiManager = new MidiManager(); 