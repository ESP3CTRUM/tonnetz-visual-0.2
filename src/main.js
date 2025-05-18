import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TonnetzGrid } from './TonnetzGrid.js';
import { audioEngine } from './audio.js';
import { midiManager } from './midi.js';
import * as Tone from 'tone';

class TonnetzVisualizer {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        document.body.appendChild(this.renderer.domElement);

        // Configuración de la cámara
        this.camera.position.z = 10;

        // Controles de órbita
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Crear la cuadrícula del Tonnetz
        this.tonnetzGrid = new TonnetzGrid(this.scene);

        // Configurar raycaster para interacción
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.setupInteraction();

        // MIDI
        this.midiLoaded = false;
        this.midiEvents = [];
        this.midiNoteToNodeId = this.buildMidiNoteToNodeId();
        this.setupMidiInput();
        this.setupMidiPlayback();

        // Manejo de redimensionamiento de ventana
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Iniciar el bucle de renderizado
        this.animate();
    }

    buildMidiNoteToNodeId() {
        // Mapea notas MIDI a nodeId según la asignación de notas en TonnetzGrid
        const map = {};
        for (const [id, note] of this.tonnetzGrid.nodeNotes.entries()) {
            // Convertir nota (ej: C4) a número MIDI
            const midiNumber = this.noteToMidiNumber(note);
            map[midiNumber] = id;
        }
        return map;
    }

    noteToMidiNumber(note) {
        // Convierte una nota tipo 'C4' a número MIDI
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const match = note.match(/^([A-G]#?)(\d)$/);
        if (!match) return null;
        const pitch = match[1];
        const octave = parseInt(match[2], 10);
        return notes.indexOf(pitch) + 12 * (octave + 1);
    }

    setupMidiInput() {
        const input = document.getElementById('midi-input');
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const arrayBuffer = event.target.result;
                midiManager.parse(arrayBuffer);
                this.midiEvents = midiManager.getNoteEvents();
                this.midiLoaded = true;
                alert('Archivo MIDI cargado correctamente.');
            };
            reader.readAsArrayBuffer(file);
        });
    }

    setupMidiPlayback() {
        const playBtn = document.getElementById('play-midi');
        playBtn.addEventListener('click', async () => {
            if (!this.midiLoaded || this.midiEvents.length === 0) {
                alert('Primero carga un archivo MIDI.');
                return;
            }
            await audioEngine.resumeContext();
            Tone.Transport.cancel();
            Tone.Transport.stop();
            Tone.Transport.position = 0;

            // Programar eventos en Tone.Transport
            const ticksPerBeat = midiManager.getTicksPerBeat();
            const tempo = midiManager.getTempo();
            Tone.Transport.bpm.value = tempo;
            for (const event of this.midiEvents) {
                const time = (event.time / ticksPerBeat) * (60 / tempo);
                Tone.Transport.schedule((t) => {
                    // Buscar el nodo correspondiente
                    const nodeId = this.midiNoteToNodeId[event.note];
                    if (nodeId) {
                        this.tonnetzGrid.updateNodeColor(nodeId, 0x00ff00);
                        setTimeout(() => {
                            this.tonnetzGrid.updateNodeColor(nodeId, 0xffffff);
                        }, 200);
                        // Reproducir la nota
                        const note = this.tonnetzGrid.getNodeNote(nodeId);
                        if (note) {
                            audioEngine.playNote(note, '8n');
                        }
                    }
                }, time);
            }
            Tone.Transport.start();
        });
    }

    setupInteraction() {
        window.addEventListener('click', async (event) => {
            // Reanudar contexto de audio si es necesario
            await audioEngine.resumeContext();

            // Calcular posición del mouse en coordenadas normalizadas (-1 a +1)
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            // Actualizar el raycaster
            this.raycaster.setFromCamera(this.mouse, this.camera);

            // Obtener intersecciones con los nodos
            const intersects = this.raycaster.intersectObjects(
                Array.from(this.tonnetzGrid.nodes.values())
            );

            if (intersects.length > 0) {
                const node = intersects[0].object;
                // Encontrar el ID del nodo
                for (const [id, mesh] of this.tonnetzGrid.nodes.entries()) {
                    if (mesh === node) {
                        this.tonnetzGrid.updateNodeColor(id, 0xff0000);
                        // Obtener la nota y reproducirla
                        const note = this.tonnetzGrid.getNodeNote(id);
                        if (note) {
                            audioEngine.playNote(note);
                        }
                        break;
                    }
                }
            }
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Iniciar la aplicación
const app = new TonnetzVisualizer();
