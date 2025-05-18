import * as THREE from 'three';

export class TonnetzGrid {
    constructor(scene) {
        this.scene = scene;
        this.nodes = new Map();
        this.connections = [];
        this.nodeGeometry = new THREE.SphereGeometry(0.45, 32, 32);
        this.nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.connectionMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
        
        this.generateGrid();
    }

    generateGrid() {
        // Generar nodos en una cuadrícula triangular
        const spacing = 1.5;
        const rows = 5;
        const cols = 7;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * spacing;
                const y = row * spacing * Math.sqrt(3) / 2;
                const z = 0;

                const node = new THREE.Mesh(this.nodeGeometry, this.nodeMaterial);
                node.position.set(x, y, z);
                this.scene.add(node);
                this.nodes.set(`${row}-${col}`, node);

                // Crear conexiones horizontales
                if (col < cols - 1) {
                    this.createConnection(node, this.nodes.get(`${row}-${col + 1}`));
                }

                // Crear conexiones diagonales
                if (row < rows - 1) {
                    if (col < cols - 1) {
                        this.createConnection(node, this.nodes.get(`${row + 1}-${col + 1}`));
                    }
                    if (col > 0) {
                        this.createConnection(node, this.nodes.get(`${row + 1}-${col - 1}`));
                    }
                }
            }
        }
    }

    createConnection(node1, node2) {
        const start = node1.position;
        const end = node2.position;
        
        // Calcular la dirección y longitud del cilindro
        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();
        
        // Crear geometría del cilindro
        const cylinderGeometry = new THREE.CylinderGeometry(0.12, 0.12, length, 32);
        
        // Crear el cilindro
        const cylinder = new THREE.Mesh(cylinderGeometry, this.connectionMaterial);
        
        // Posicionar y orientar el cilindro
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        cylinder.position.copy(midpoint);
        
        // Orientar el cilindro para que apunte de start a end
        cylinder.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
        );
        
        this.scene.add(cylinder);
        this.connections.push(cylinder);
    }

    updateNodeColor(nodeId, color) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.material.color.set(color);
        }
    }

    updateConnectionColor(connectionIndex, color) {
        const connection = this.connections[connectionIndex];
        if (connection) {
            connection.material.color.set(color);
        }
    }
} 