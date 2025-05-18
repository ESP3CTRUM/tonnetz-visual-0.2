import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TonnetzGrid } from './TonnetzGrid.js';
import { audioEngine } from './audio.js';
import { midiManager } from './midi.js';
import * as Tone from 'tone';
import TWEEN from '@tweenjs/tween.js';

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
        this.activeNodes = new Set();
        this.activeTriads = new Set();
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
        const map = {};
        for (const [id, note] of this.tonnetzGrid.nodeNotes.entries()) {
            const midiNumber = this.noteToMidiNumber(note);
            map[midiNumber] = id;
        }
        return map;
    }

    noteToMidiNumber(note) {
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

            const ticksPerBeat = midiManager.getTicksPerBeat();
            const tempo = midiManager.getTempo();
            Tone.Transport.bpm.value = tempo;
            for (const event of this.midiEvents) {
                const time = (event.time / ticksPerBeat) * (60 / tempo);
                Tone.Transport.schedule((t) => {
                    const nodeId = this.midiNoteToNodeId[event.note];
                    if (nodeId) {
                        this.animateNode(nodeId, 0x00ff00);
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

    animateNode(nodeId, color) {
        const node = this.tonnetzGrid.nodes.get(nodeId);
        if (!node) return;
        // Animar color
        const origColor = node.material.color.clone();
        new TWEEN.Tween(node.material.color)
            .to({ r: ((color >> 16) & 0xff) / 255, g: ((color >> 8) & 0xff) / 255, b: (color & 0xff) / 255 }, 150)
            .yoyo(true)
            .repeat(1)
            .start();
        // Animar escala
        new TWEEN.Tween(node.scale)
            .to({ x: 1.5, y: 1.5, z: 1.5 }, 150)
            .yoyo(true)
            .repeat(1)
            .start();
    }

    animateTriad(triad, color) {
        if (!triad) return;
        // Animar color
        new TWEEN.Tween(triad.material.color)
            .to({ r: ((color >> 16) & 0xff) / 255, g: ((color >> 8) & 0xff) / 255, b: (color & 0xff) / 255 }, 150)
            .yoyo(true)
            .repeat(1)
            .start();
        // Animar escala
        new TWEEN.Tween(triad.scale)
            .to({ x: 1.5, y: 1.5, z: 1.5 }, 150)
            .yoyo(true)
            .repeat(1)
            .start();
    }

    setupInteraction() {
        window.addEventListener('click', async (event) => {
            await audioEngine.resumeContext();
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);
            // Buscar intersección con nodos y triángulos
            const objects = [
                ...Array.from(this.tonnetzGrid.nodes.values()),
                ...this.tonnetzGrid.triads
            ];
            const intersects = this.raycaster.intersectObjects(objects);
            if (intersects.length > 0) {
                const obj = intersects[0].object;
                if (obj.userData.type === 'node') {
                    // Animar nodo
                    for (const [id, mesh] of this.tonnetzGrid.nodes.entries()) {
                        if (mesh === obj) {
                            this.animateNode(id, 0xff0000);
                            const note = this.tonnetzGrid.getNodeNote(id);
                            if (note) {
                                audioEngine.playNote(note);
                            }
                            break;
                        }
                    }
                } else if (obj.userData.type === 'triad') {
                    // Animar triada y sus nodos
                    this.animateTriad(obj, 0xffff00);
                    for (const node of obj.userData.nodes) {
                        for (const [id, mesh] of this.tonnetzGrid.nodes.entries()) {
                            if (mesh === node) {
                                this.animateNode(id, 0xffff00);
                            }
                        }
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
        TWEEN.update();
        this.renderer.render(this.scene, this.camera);
    }
}

const app = new TonnetzVisualizer();
