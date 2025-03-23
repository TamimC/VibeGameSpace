import * as THREE from 'three';

export class Game {
    constructor() {
        // Remove the promise-based approach and let showNameDialog handle initialization
        this.showNameDialog();
    }

    showNameDialog() {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            padding: 30px;
            border-radius: 10px;
            color: white;
            text-align: center;
            z-index: 1000;
            border: 2px solid #00ff00;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
            min-width: 300px;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Enter Your Name';
        title.style.cssText = `
            margin: 0 0 20px 0;
            font-size: 24px;
            color: #00ff00;
            text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
        `;
        dialog.appendChild(title);

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Your name';
        nameInput.style.cssText = `
            padding: 10px;
            margin-bottom: 20px;
            width: 100%;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid #00ff00;
            color: white;
            border-radius: 5px;
            font-size: 16px;
            box-sizing: border-box;
        `;
        dialog.appendChild(nameInput);

        const colorLabel = document.createElement('label');
        colorLabel.textContent = 'Choose Ship Color:';
        colorLabel.style.cssText = `
            display: block;
            margin-bottom: 10px;
            color: #00ff00;
        `;
        dialog.appendChild(colorLabel);

        // Create a container for color picker and button
        const controlsContainer = document.createElement('div');
        controlsContainer.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: center;
            align-items: center;
        `;
        dialog.appendChild(controlsContainer);

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = '#ffffff';
        colorInput.style.cssText = `
            width: 50px;
            height: 50px;
            padding: 0;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            background: none;
        `;
        controlsContainer.appendChild(colorInput);

        const startButton = document.createElement('button');
        startButton.textContent = 'Start Game';
        startButton.style.cssText = `
            padding: 15px 30px;
            background: #00ff00;
            border: none;
            color: black;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            transition: all 0.3s ease;
            flex-grow: 1;
        `;

        startButton.onmouseover = () => {
            startButton.style.backgroundColor = '#00cc00';
            startButton.style.transform = 'scale(1.05)';
        };

        startButton.onmouseout = () => {
            startButton.style.backgroundColor = '#00ff00';
            startButton.style.transform = 'scale(1)';
        };

        controlsContainer.appendChild(startButton);

        const startGame = () => {
            const name = nameInput.value.trim();
            if (name) {
                this.playerName = name;
                this.playerColor = colorInput.value;
                document.body.removeChild(dialog);
                // Initialize game after we have the color
                this.initializeGame();
            } else {
                nameInput.style.border = '1px solid red';
                nameInput.style.animation = 'shake 0.5s';
            }
        };

        startButton.onclick = startGame;
        nameInput.onkeypress = (e) => {
            if (e.key === 'Enter') startGame();
        };

        // Add shake animation for invalid input
        const style = document.createElement('style');
        style.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-10px); }
                75% { transform: translateX(10px); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(dialog);
        nameInput.focus();
    }

    initializeGame() {
        // Initialize all the basic properties first
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Initialize all the game variables
        this.moveSpeed = 0.1;
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            x: false,
            q: false,
            shift: false
        };

        // Camera smoothing variables
        this.cameraSmoothing = 0.1;
        this.targetCameraPosition = new THREE.Vector3();
        this.targetCameraLookAt = new THREE.Vector3();

        // Mouse look variables
        this.mouseSensitivity = 0.002;
        this.isPointerLocked = false;
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

        // Avatar variables
        this.avatar = null;
        this.avatarHeight = 1.8; // Height of the avatar in units
        this.avatarOffset = new THREE.Vector3(0, 0, 0); // No offset, we'll handle camera position differently

        // Multiplayer variables
        this.playerId = null;
        this.otherPlayers = new Map();
        this.ws = null;
        this.lastUpdate = 0;
        this.updateInterval = 50; // Update every 50ms

        // UI elements
        this.coordDisplay = null;
        this.goldDisplay = null;

        // Health variables
        this.maxHealth = 100;
        this.currentHealth = this.maxHealth;
        this.healthBar = null;
        this.healthText = null;
        this.isInvulnerable = false;
        this.invulnerabilityDuration = 2000; // 2 seconds of invulnerability after taking damage
        this.lastDamageTime = 0;

        // Shooting variables
        this.lastShotTime = 0;
        this.shootCooldown = 250; // 250ms between shots
        this.laserSpeed = 2;
        this.lasers = [];
        this.shootStatusText = null; // Add status text for shooting

        // Gold system
        this.gold = 0;
        this.monsters = [];
        this.lastMonsterSpawn = 0;
        this.monsterSpawnInterval = 5000; // Spawn a monster every 5 seconds
        this.monsterSpeed = 0.05;
        this.monsterReward = 10;

        // Nitros variables
        this.maxNitros = 100;
        this.currentNitros = this.maxNitros;
        this.nitrosBar = null;
        this.nitrosText = null;
        this.isUsingNitros = false;
        this.nitrosDrainRate = 0.5; // Reduced drain rate for smoother depletion
        this.nitrosRechargeRate = 0.2; // Reduced recharge rate for smoother recovery
        this.nitrosSpeedMultiplier = 2;
        this.lastNitrosUpdate = 0;
        this.nitrosUpdateInterval = 16; // Update every 16ms (roughly 60fps)

        // Notification system
        this.notificationContainer = null;
        this.notifications = [];
        this.notificationDuration = 3000; // 3 seconds

        // Leaderboard variables
        this.leaderboardContainer = null;
        this.leaderboardEntries = new Map();
        this.leaderboardUpdateInterval = 1000; // Update every second
        this.lastLeaderboardUpdate = 0;

        // Add pointer lock maintenance variables
        this.lastPointerLockCheck = 0;
        this.pointerLockCheckInterval = 1000; // Check every second
        this.pointerLockAttempts = 0;
        this.maxPointerLockAttempts = 3;

        // Setup everything in the correct order
        this.setupScene();
        this.setupAvatar();  // Now this will use the correct this.playerColor
        this.setupControls();
        this.setupMultiplayer();
        this.setupUI();
        this.animate();
    }

    setupScene() {
        // Set background to space
        this.scene.background = new THREE.Color(0x000000);

        // Add some dim ambient lighting to simulate starlight
        const ambientLight = new THREE.AmbientLight(0x222244, 0.2);
        this.scene.add(ambientLight);

        // Add a sun-like directional light
        const sunLight = new THREE.DirectionalLight(0xffffdd, 1);
        sunLight.position.set(10, 5, 5);
        this.scene.add(sunLight);

        // Create a star field
        const starsGeometry = new THREE.BufferGeometry();
        const starsVertices = [];
        
        for(let i = 0; i < 5000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = (Math.random() - 0.5) * 2000;
            starsVertices.push(x, y, z);
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            sizeAttenuation: false
        });
        const starField = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(starField);

        // Add some floating asteroids
        for (let i = 0; i < 30; i++) {
            const radius = Math.random() * 2 + 0.5;
            const geometry = new THREE.IcosahedronGeometry(radius, 0);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x808080,
                roughness: 0.9,
                metalness: 0.1
            });
            const asteroid = new THREE.Mesh(geometry, material);
            
            asteroid.position.x = (Math.random() - 0.5) * 100;
            asteroid.position.y = (Math.random() - 0.5) * 100;
            asteroid.position.z = (Math.random() - 0.5) * 100;
            
            asteroid.rotation.x = Math.random() * Math.PI;
            asteroid.rotation.y = Math.random() * Math.PI;
            asteroid.rotation.z = Math.random() * Math.PI;
            
            this.scene.add(asteroid);
        }

        // Position camera behind the ship
        this.camera.position.set(0, 2, 5);
        this.camera.lookAt(0, 0, 0);
    }

    setupAvatar() {
        this.avatar = this.createSpaceship();
        this.scene.add(this.avatar);
    }

    setupControls() {
        // Keyboard controls
        window.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = true;
            }
            if (key === ' ') {
                this.keys[' '] = true;
            }
            if (key === 'shift') {
                this.keys.shift = true;
            }
        });

        window.addEventListener('keyup', (event) => {
            const key = event.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = false;
            }
            if (key === ' ') {
                this.keys[' '] = false;
            }
            if (key === 'shift') {
                this.keys.shift = false;
                this.isUsingNitros = false; // Reset nitros state when shift is released
            }
        });

        // Mouse look controls
        document.addEventListener('click', () => {
            this.requestPointerLockWithRetry();
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement !== null;
            this.pointerLockAttempts = 0; // Reset attempts when lock changes
            
            if (this.isPointerLocked) {
                // Reset the check timer when we get the lock
                this.lastPointerLockCheck = Date.now();
                if (this.shootStatusText) {
                    this.shootStatusText.textContent = 'SHOOTING: READY';
                    this.shootStatusText.style.color = '#00ff00';
                }
            } else {
                // Immediately try to regain pointer lock
                this.requestPointerLockWithRetry();
                if (this.shootStatusText) {
                    this.shootStatusText.textContent = 'SHOOTING: CLICK TO LOCK MOUSE';
                    this.shootStatusText.style.color = '#ff0000';
                }
            }
        });

        // Add pointer lock error handling
        document.addEventListener('pointerlockerror', () => {
            console.log('Pointer lock error occurred');
            this.requestPointerLockWithRetry();
        });

        // Add visibility change handling
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // When tab becomes visible again, try to regain pointer lock
                this.requestPointerLockWithRetry();
            }
        });

        document.addEventListener('mousemove', (event) => {
            if (this.isPointerLocked) {
                this.euler.setFromQuaternion(this.camera.quaternion);
                this.euler.y -= event.movementX * this.mouseSensitivity;
                this.euler.x -= event.movementY * this.mouseSensitivity;
                this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
                this.camera.quaternion.setFromEuler(this.euler);
            }
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Add focus handling
        window.addEventListener('focus', () => {
            this.requestPointerLockWithRetry();
        });
    }

    requestPointerLockWithRetry() {
        if (!this.isPointerLocked && this.pointerLockAttempts < this.maxPointerLockAttempts) {
            document.body.requestPointerLock();
            this.pointerLockAttempts++;
            
            // Reset attempts after a delay
            setTimeout(() => {
                this.pointerLockAttempts = 0;
            }, 1000);
        }
    }

    setupMultiplayer() {
        console.log('Connecting to WebSocket server...');
        
        try {
            this.ws = new WebSocket('ws://10.0.0.126:8080');
            
            const connectionTimeout = setTimeout(() => {
                if (this.ws.readyState !== WebSocket.OPEN) {
                    console.log('Connection timeout - server not responding');
                    this.showNotification('Server not responding. Make sure the server is running.', '#ff0000');
                    this.ws.close();
                }
            }, 5000);

            this.ws.onopen = () => {
                clearTimeout(connectionTimeout);
                console.log('Connected to WebSocket server');
                this.showNotification('Connected to server', '#00ff00');
                // Send player name along with request
                this.ws.send(JSON.stringify({ 
                    type: 'requestPlayers',
                    name: this.playerName,
                    color: this.playerColor
                }));
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('Received message:', data);
                
                switch (data.type) {
                    case 'init':
                        this.playerId = data.id;
                        console.log('Initialized with player ID:', this.playerId);
                        // Add current player to leaderboard immediately
                        this.leaderboardEntries.set(this.playerId, {
                            gold: this.gold,
                            name: this.playerName
                        });
                        break;
                    case 'players':
                        console.log('Received players list:', data.players);
                        // Clear existing players first
                        this.otherPlayers.forEach((player) => {
                            this.scene.remove(player);
                        });
                        this.otherPlayers.clear();
                        
                        // Add all other players
                        data.players.forEach(player => {
                            if (player.id !== this.playerId) {
                                console.log('Adding other player:', player.id);
                                this.addOtherPlayer(player);
                                this.showNotification(`${player.name} joined the game`);
                                // Add player to leaderboard with their gold amount
                                this.leaderboardEntries.set(player.id, {
                                    gold: player.gold || 0,
                                    name: player.name
                                });
                            }
                        });
                        break;
                    case 'newPlayer':
                        console.log('New player joined:', data.id);
                        if (data.id !== this.playerId) {
                            this.addOtherPlayer(data);
                            this.showNotification(`${data.name} joined the game`);
                            // Add new player to leaderboard with their gold amount
                            this.leaderboardEntries.set(data.id, {
                                gold: data.gold || 0,
                                name: data.name
                            });
                        }
                        break;
                    case 'playerUpdate':
                        console.log('Player update:', data.id);
                        if (data.id !== this.playerId) {
                            this.updateOtherPlayer(data);
                            // Update leaderboard entry for this player
                            if (this.leaderboardEntries.has(data.id)) {
                                const entry = this.leaderboardEntries.get(data.id);
                                entry.gold = data.gold || 0;
                                entry.name = data.name;
                            }
                        }
                        break;
                    case 'playerLeft':
                        console.log('Player left:', data.id);
                        if (data.id !== this.playerId) {
                            const playerName = this.leaderboardEntries.get(data.id)?.name || 'Unknown player';
                            this.removeOtherPlayer(data.id);
                            this.showNotification(`${playerName} left the game`, '#ff0000');
                            // Remove player from leaderboard
                            this.leaderboardEntries.delete(data.id);
                        }
                        break;
                }
            };

            this.ws.onclose = (event) => {
                console.log('Disconnected from server:', event.code, event.reason);
                this.showNotification('Disconnected from server. Make sure the server is running.', '#ff0000');
                // Try to reconnect after a delay
                setTimeout(() => {
                    console.log('Attempting to reconnect...');
                    this.setupMultiplayer();
                }, 5000);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.showNotification('Connection error. Make sure the server is running.', '#ff0000');
            };
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.showNotification('Failed to connect. Make sure the server is running.', '#ff0000');
            // Try to reconnect after a delay
            setTimeout(() => {
                console.log('Attempting to reconnect...');
                this.setupMultiplayer();
            }, 5000);
        }
    }

    addOtherPlayer(data) {
        console.log('Creating spaceship for player:', data.id);
        const otherAvatar = this.createSpaceship();
        
        // Set initial position and rotation
        if (data.position) {
            otherAvatar.position.set(data.position.x, data.position.y, data.position.z);
        }
        if (data.rotation) {
            otherAvatar.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
        }
        
        // Make other players slightly different color
        otherAvatar.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material.color.setHex(0x00ffff); // Cyan color for other players
            }
        });
        
        this.scene.add(otherAvatar);
        this.otherPlayers.set(data.id, otherAvatar);
        console.log('Current players:', Array.from(this.otherPlayers.keys()));
    }

    updateOtherPlayer(data) {
        const otherAvatar = this.otherPlayers.get(data.id);
        if (otherAvatar) {
            if (data.position) {
                otherAvatar.position.set(data.position.x, data.position.y, data.position.z);
            }
            if (data.rotation) {
                otherAvatar.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
            }
        }
    }

    removeOtherPlayer(id) {
        const otherAvatar = this.otherPlayers.get(id);
        if (otherAvatar) {
            this.scene.remove(otherAvatar);
            this.otherPlayers.delete(id);
        }
    }

    createSpaceship() {
        const ship = new THREE.Group();

        // Create materials with the player's color
        const mainMaterial = new THREE.MeshStandardMaterial({ 
            color: this.playerColor,
            metalness: 0.3,
            roughness: 0.4,
            emissive: this.playerColor,
            emissiveIntensity: 0.2
        });

        // Main body (fuselage)
        const bodyGeometry = new THREE.ConeGeometry(0.3, 1.2, 8);
        const body = new THREE.Mesh(bodyGeometry, mainMaterial);
        body.rotation.x = -Math.PI / 2;
        body.position.y = 0.6;
        ship.add(body);

        // Cockpit
        const cockpitGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const cockpitMaterial = new THREE.MeshStandardMaterial({ 
            color: this.playerColor,
            metalness: 0.3,
            roughness: 0.4,
            emissive: this.playerColor,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.8
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(0, 1.2, 0);
        ship.add(cockpit);

        // Wings
        const wingGeometry = new THREE.BoxGeometry(2, 0.1, 0.5);
        const wings = new THREE.Mesh(wingGeometry, mainMaterial);
        wings.position.set(0, 0.8, 0);
        ship.add(wings);

        // Gun
        const gunGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
        const gun = new THREE.Mesh(gunGeometry, mainMaterial);
        gun.rotation.x = Math.PI / 2;
        gun.position.set(0, 0.8, 0.3);
        ship.add(gun);

        // Engine exhaust
        const exhaustGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 8);
        const exhaustMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff3300,
            emissive: 0xff3300,
            emissiveIntensity: 0.8
        });
        const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
        exhaust.position.set(0, 0.6, -0.6);
        exhaust.rotation.x = Math.PI / 2;
        ship.add(exhaust);

        // Create flame particles
        const flameGeometry = new THREE.BufferGeometry();
        const flameCount = 50;
        const flamePositions = new Float32Array(flameCount * 3);
        const flameColors = new Float32Array(flameCount * 3);
        const flameSizes = new Float32Array(flameCount);
        
        for (let i = 0; i < flameCount; i++) {
            flamePositions[i * 3] = 0;     // x
            flamePositions[i * 3 + 1] = 0; // y
            flamePositions[i * 3 + 2] = 0; // z
            
            // Random colors between red and yellow
            flameColors[i * 3] = 1;     // r
            flameColors[i * 3 + 1] = Math.random() * 0.5; // g
            flameColors[i * 3 + 2] = 0; // b
            
            flameSizes[i] = Math.random() * 0.5 + 0.1;
        }
        
        flameGeometry.setAttribute('position', new THREE.BufferAttribute(flamePositions, 3));
        flameGeometry.setAttribute('color', new THREE.BufferAttribute(flameColors, 3));
        flameGeometry.setAttribute('size', new THREE.BufferAttribute(flameSizes, 1));
        
        const flameMaterial = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });
        
        const flames = new THREE.Points(flameGeometry, flameMaterial);
        flames.position.set(0, 0.6, 0.6); // Position at back of ship
        ship.add(flames);
        ship.flames = flames;
        ship.flamePositions = flamePositions;
        ship.flameColors = flameColors;
        ship.flameSizes = flameSizes;

        return ship;
    }

    createLaser() {
        const laserGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
        const laserMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.8
        });
        const laser = new THREE.Mesh(laserGeometry, laserMaterial);
        
        // Position laser at the gun
        const gunPosition = new THREE.Vector3(0, 0.8, 0.3);
        gunPosition.applyQuaternion(this.avatar.quaternion);
        laser.position.copy(this.avatar.position).add(gunPosition);
        
        // Set laser rotation to match ship's rotation
        laser.rotation.copy(this.avatar.rotation);
        
        // Set laser direction based on ship's forward direction
        const direction = new THREE.Vector3(0, 0, -1); // Changed to negative Z to shoot outward
        direction.applyQuaternion(this.avatar.quaternion);
        laser.direction = direction;
        
        this.scene.add(laser);
        this.lasers.push(laser);
    }

    setupUI() {
        // Create coordinate display
        this.coordDisplay = document.createElement('div');
        this.coordDisplay.style.position = 'absolute';
        this.coordDisplay.style.top = '20px';
        this.coordDisplay.style.right = '20px';
        this.coordDisplay.style.color = '#ffffff';
        this.coordDisplay.style.fontFamily = 'monospace';
        this.coordDisplay.style.fontSize = '16px';
        this.coordDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.coordDisplay.style.padding = '10px';
        this.coordDisplay.style.borderRadius = '5px';
        document.body.appendChild(this.coordDisplay);

        // Create health bar container
        const healthContainer = document.createElement('div');
        healthContainer.style.position = 'absolute';
        healthContainer.style.top = '20px';
        healthContainer.style.left = '20px';
        healthContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        healthContainer.style.padding = '10px';
        healthContainer.style.borderRadius = '5px';
        healthContainer.style.color = '#ffffff';
        healthContainer.style.fontFamily = 'monospace';
        healthContainer.style.fontSize = '16px';
        healthContainer.style.minWidth = '200px';
        document.body.appendChild(healthContainer);

        // Create health text
        this.healthText = document.createElement('div');
        this.healthText.textContent = 'HP: 100/100';
        healthContainer.appendChild(this.healthText);

        // Create health bar
        const healthBarContainer = document.createElement('div');
        healthBarContainer.style.width = '100%';
        healthBarContainer.style.height = '20px';
        healthBarContainer.style.backgroundColor = '#333';
        healthBarContainer.style.borderRadius = '10px';
        healthBarContainer.style.overflow = 'hidden';
        healthBarContainer.style.marginTop = '5px';
        healthContainer.appendChild(healthBarContainer);

        this.healthBar = document.createElement('div');
        this.healthBar.style.width = '100%';
        this.healthBar.style.height = '100%';
        this.healthBar.style.backgroundColor = '#00ff00';
        this.healthBar.style.transition = 'width 0.3s ease-in-out';
        healthBarContainer.appendChild(this.healthBar);

        // Create nitros container
        const nitrosContainer = document.createElement('div');
        nitrosContainer.style.position = 'absolute';
        nitrosContainer.style.top = '90px'; // Adjusted spacing
        nitrosContainer.style.left = '20px';
        nitrosContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        nitrosContainer.style.padding = '10px';
        nitrosContainer.style.borderRadius = '5px';
        nitrosContainer.style.color = '#ffffff';
        nitrosContainer.style.fontFamily = 'monospace';
        nitrosContainer.style.fontSize = '16px';
        nitrosContainer.style.minWidth = '200px';
        document.body.appendChild(nitrosContainer);

        // Create nitros text
        this.nitrosText = document.createElement('div');
        this.nitrosText.textContent = 'NITROS: 100/100';
        nitrosContainer.appendChild(this.nitrosText);

        // Create nitros bar
        const nitrosBarContainer = document.createElement('div');
        nitrosBarContainer.style.width = '100%';
        nitrosBarContainer.style.height = '20px';
        nitrosBarContainer.style.backgroundColor = '#333';
        nitrosBarContainer.style.borderRadius = '10px';
        nitrosBarContainer.style.overflow = 'hidden';
        nitrosBarContainer.style.marginTop = '5px';
        nitrosContainer.appendChild(nitrosBarContainer);

        this.nitrosBar = document.createElement('div');
        this.nitrosBar.style.width = '100%';
        this.nitrosBar.style.height = '100%';
        this.nitrosBar.style.backgroundColor = '#00ffff';
        this.nitrosBar.style.transition = 'width 0.3s ease-in-out';
        nitrosBarContainer.appendChild(this.nitrosBar);

        // Create gold display
        const goldContainer = document.createElement('div');
        goldContainer.style.position = 'absolute';
        goldContainer.style.bottom = '20px';
        goldContainer.style.left = '20px';
        goldContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        goldContainer.style.padding = '10px';
        goldContainer.style.borderRadius = '5px';
        goldContainer.style.color = '#ffd700';
        goldContainer.style.fontFamily = 'monospace';
        goldContainer.style.fontSize = '16px';
        goldContainer.style.minWidth = '200px';
        document.body.appendChild(goldContainer);

        this.goldDisplay = document.createElement('div');
        this.goldDisplay.textContent = 'Gold: 0';
        goldContainer.appendChild(this.goldDisplay);

        // Create shooting status display
        const shootStatusContainer = document.createElement('div');
        shootStatusContainer.style.position = 'absolute';
        shootStatusContainer.style.top = '160px'; // Adjusted spacing
        shootStatusContainer.style.left = '20px';
        shootStatusContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        shootStatusContainer.style.padding = '10px';
        shootStatusContainer.style.borderRadius = '5px';
        shootStatusContainer.style.color = '#ffffff';
        shootStatusContainer.style.fontFamily = 'monospace';
        shootStatusContainer.style.fontSize = '16px';
        shootStatusContainer.style.minWidth = '200px';
        document.body.appendChild(shootStatusContainer);

        this.shootStatusText = document.createElement('div');
        this.shootStatusText.textContent = 'SHOOTING: READY';
        shootStatusContainer.appendChild(this.shootStatusText);

        // Create notification container
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.style.position = 'absolute';
        this.notificationContainer.style.top = '20px';
        this.notificationContainer.style.left = '50%';
        this.notificationContainer.style.transform = 'translateX(-50%)';
        this.notificationContainer.style.zIndex = '1000';
        document.body.appendChild(this.notificationContainer);

        // Create leaderboard container
        this.leaderboardContainer = document.createElement('div');
        this.leaderboardContainer.style.position = 'absolute';
        this.leaderboardContainer.style.top = '20px';
        this.leaderboardContainer.style.right = '20px';
        this.leaderboardContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.leaderboardContainer.style.padding = '10px';
        this.leaderboardContainer.style.borderRadius = '5px';
        this.leaderboardContainer.style.color = '#ffffff';
        this.leaderboardContainer.style.fontFamily = 'monospace';
        this.leaderboardContainer.style.fontSize = '16px';
        this.leaderboardContainer.style.minWidth = '200px';
        document.body.appendChild(this.leaderboardContainer);

        // Create leaderboard title
        const leaderboardTitle = document.createElement('div');
        leaderboardTitle.textContent = 'LEADERBOARD';
        leaderboardTitle.style.textAlign = 'center';
        leaderboardTitle.style.fontWeight = 'bold';
        leaderboardTitle.style.marginBottom = '10px';
        leaderboardTitle.style.color = '#ffd700';
        this.leaderboardContainer.appendChild(leaderboardTitle);

        // Create leaderboard entries container
        this.leaderboardEntriesContainer = document.createElement('div');
        this.leaderboardEntriesContainer.style.display = 'flex';
        this.leaderboardEntriesContainer.style.flexDirection = 'column';
        this.leaderboardEntriesContainer.style.gap = '5px';
        this.leaderboardContainer.appendChild(this.leaderboardEntriesContainer);
    }

    showNotification(message, color = '#00ff00') {
        const notification = document.createElement('div');
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        notification.style.color = color;
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.marginBottom = '10px';
        notification.style.fontFamily = 'monospace';
        notification.style.fontSize = '16px';
        notification.style.transition = 'opacity 0.5s ease-out';
        notification.style.opacity = '1';
        notification.textContent = message;
        
        this.notificationContainer.appendChild(notification);
        this.notifications.push(notification);

        // Remove notification after duration
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                this.notificationContainer.removeChild(notification);
                this.notifications = this.notifications.filter(n => n !== notification);
            }, 500);
        }, this.notificationDuration);
    }

    takeDamage(amount) {
        if (this.isInvulnerable) return;

        const now = Date.now();
        if (now - this.lastDamageTime < this.invulnerabilityDuration) return;

        this.currentHealth = Math.max(0, this.currentHealth - amount);
        this.lastDamageTime = now;
        this.isInvulnerable = true;

        // Update health bar
        const healthPercent = (this.currentHealth / this.maxHealth) * 100;
        this.healthBar.style.width = `${healthPercent}%`;
        this.healthText.textContent = `HP: ${this.currentHealth}/${this.maxHealth}`;

        // Change health bar color based on health percentage
        if (healthPercent > 60) {
            this.healthBar.style.backgroundColor = '#00ff00';
        } else if (healthPercent > 30) {
            this.healthBar.style.backgroundColor = '#ffff00';
        } else {
            this.healthBar.style.backgroundColor = '#ff0000';
        }

        // Flash effect when taking damage
        this.healthBar.style.backgroundColor = '#ff0000';
        setTimeout(() => {
            if (healthPercent > 60) {
                this.healthBar.style.backgroundColor = '#00ff00';
            } else if (healthPercent > 30) {
                this.healthBar.style.backgroundColor = '#ffff00';
            } else {
                this.healthBar.style.backgroundColor = '#ff0000';
            }
        }, 100);

        // Ensure pointer lock is maintained
        if (!this.isPointerLocked) {
            document.body.requestPointerLock();
        }

        // End invulnerability after duration
        setTimeout(() => {
            this.isInvulnerable = false;
            // Ensure pointer lock is still active after invulnerability ends
            if (!this.isPointerLocked) {
                document.body.requestPointerLock();
            }
        }, this.invulnerabilityDuration);

        // Check for death
        if (this.currentHealth <= 0) {
            this.handleDeath();
        }
    }

    handleDeath() {
        // Reset position and health with new camera position
        this.camera.position.set(0, 2, 5);
        this.camera.lookAt(0, 0, 0);
        this.currentHealth = this.maxHealth;
        this.healthBar.style.width = '100%';
        this.healthBar.style.backgroundColor = '#00ff00';
        this.healthText.textContent = `HP: ${this.currentHealth}/${this.maxHealth}`;
        
        // Ensure pointer lock is maintained after death
        if (!this.isPointerLocked) {
            document.body.requestPointerLock();
        }
    }

    createMonster() {
        const monster = new THREE.Group();

        // Monster body
        const bodyGeometry = new THREE.OctahedronGeometry(1, 0);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            metalness: 0.3,
            roughness: 0.4,
            emissive: 0xff0000,
            emissiveIntensity: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        monster.add(body);

        // Monster eyes
        const eyeGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.8
        });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.5, 0.5, 0);
        monster.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.5, 0.5, 0);
        monster.add(rightEye);

        // Random spawn position
        const spawnDistance = 50;
        monster.position.x = (Math.random() - 0.5) * spawnDistance;
        monster.position.y = (Math.random() - 0.5) * spawnDistance;
        monster.position.z = (Math.random() - 0.5) * spawnDistance;

        this.scene.add(monster);
        this.monsters.push(monster);
    }

    updateMonsters() {
        const now = Date.now();
        
        // Spawn new monsters
        if (now - this.lastMonsterSpawn > this.monsterSpawnInterval) {
            this.createMonster();
            this.lastMonsterSpawn = now;
        }

        // Update monster positions
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            const monster = this.monsters[i];
            
            // Move monster towards player
            const direction = new THREE.Vector3();
            direction.subVectors(this.avatar.position, monster.position).normalize();
            monster.position.addScaledVector(direction, this.monsterSpeed);

            // Rotate monster to face player
            monster.lookAt(this.avatar.position);

            // Check for collision with player
            const distance = monster.position.distanceTo(this.avatar.position);
            if (distance < 2) {
                this.takeDamage(10);
            }

            // Check for laser collisions
            for (let j = this.lasers.length - 1; j >= 0; j--) {
                const laser = this.lasers[j];
                const laserDistance = monster.position.distanceTo(laser.position);
                
                if (laserDistance < 2) {
                    // Remove monster and laser
                    this.scene.remove(monster);
                    this.monsters.splice(i, 1);
                    this.scene.remove(laser);
                    this.lasers.splice(j, 1);
                    
                    // Add gold reward
                    this.gold += this.monsterReward;
                    this.goldDisplay.textContent = `Gold: ${this.gold}`;
                    
                    // Break out of laser loop since this laser is now removed
                    break;
                }
            }
        }
    }

    updateLeaderboard() {
        const now = Date.now();
        if (now - this.lastLeaderboardUpdate < this.leaderboardUpdateInterval) return;
        this.lastLeaderboardUpdate = now;

        // Clear existing entries
        this.leaderboardEntriesContainer.innerHTML = '';

        // Update current player's gold in leaderboard
        if (this.leaderboardEntries.has(this.playerId)) {
            this.leaderboardEntries.get(this.playerId).gold = this.gold;
        }

        // Sort entries by gold amount
        const sortedEntries = Array.from(this.leaderboardEntries.entries())
            .sort((a, b) => b[1].gold - a[1].gold);

        // Display entries
        sortedEntries.forEach((entry, index) => {
            const entryDiv = document.createElement('div');
            entryDiv.style.display = 'flex';
            entryDiv.style.justifyContent = 'space-between';
            entryDiv.style.alignItems = 'center';
            entryDiv.style.padding = '5px';
            entryDiv.style.backgroundColor = entry[0] === this.playerId ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)';
            entryDiv.style.borderRadius = '3px';

            const rankDiv = document.createElement('div');
            rankDiv.style.width = '30px';
            rankDiv.textContent = `#${index + 1}`;
            rankDiv.style.color = index === 0 ? '#ffd700' : '#ffffff';

            const nameDiv = document.createElement('div');
            nameDiv.style.flex = '1';
            nameDiv.style.margin = '0 10px';
            nameDiv.textContent = entry[1].name;
            nameDiv.style.color = entry[0] === this.playerId ? '#ffd700' : '#ffffff';

            const goldDiv = document.createElement('div');
            goldDiv.textContent = `${entry[1].gold}`;
            goldDiv.style.color = '#ffd700';

            entryDiv.appendChild(rankDiv);
            entryDiv.appendChild(nameDiv);
            entryDiv.appendChild(goldDiv);
            this.leaderboardEntriesContainer.appendChild(entryDiv);
        });
    }

    update() {
        // Handle movement relative to camera direction
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();

        const right = new THREE.Vector3();
        right.crossVectors(this.camera.up, direction).normalize();

        // Movement flags for animation
        let isMoving = false;
        let isMovingForward = false;
        let isMovingBackward = false;
        let isMovingLeft = false;
        let isMovingRight = false;
        let isMovingDown = false;
        let isMovingUp = false;

        // Handle nitros with improved timing
        const now = Date.now();
        if (now - this.lastNitrosUpdate >= this.nitrosUpdateInterval) {
            if (this.keys.shift && this.currentNitros > 0) {
                this.isUsingNitros = true;
                this.currentNitros = Math.max(0, this.currentNitros - this.nitrosDrainRate);
            } else {
                this.isUsingNitros = false;
                this.currentNitros = Math.min(this.maxNitros, this.currentNitros + this.nitrosRechargeRate);
            }

            // Update nitros bar with smooth transitions
            const nitrosPercent = (this.currentNitros / this.maxNitros) * 100;
            this.nitrosBar.style.width = `${nitrosPercent}%`;
            this.nitrosText.textContent = `NITROS: ${Math.round(this.currentNitros)}/${this.maxNitros}`;
            
            // Change nitros bar color based on level
            if (nitrosPercent < 20) {
                this.nitrosBar.style.backgroundColor = '#ff0000';
            } else if (nitrosPercent < 50) {
                this.nitrosBar.style.backgroundColor = '#ffff00';
            } else {
                this.nitrosBar.style.backgroundColor = '#00ffff';
            }

            this.lastNitrosUpdate = now;
        }

        // Apply movement with nitros speed multiplier
        const moveAmount = this.moveSpeed * (this.isUsingNitros ? this.nitrosSpeedMultiplier : 1);
        if (this.keys.w) {
            this.avatar.position.addScaledVector(direction, moveAmount);
            isMoving = true;
            isMovingForward = true;
        }
        if (this.keys.s) {
            this.avatar.position.addScaledVector(direction, -moveAmount);
            isMoving = true;
            isMovingBackward = true;
        }
        if (this.keys.a) {
            this.avatar.position.addScaledVector(right, moveAmount);
            isMoving = true;
            isMovingLeft = true;
        }
        if (this.keys.d) {
            this.avatar.position.addScaledVector(right, -moveAmount);
            isMoving = true;
            isMovingRight = true;
        }
        if (this.keys.x) {
            this.avatar.position.y -= moveAmount;
            isMoving = true;
            isMovingDown = true;
        }
        if (this.keys.q) {
            this.avatar.position.y += moveAmount;
            isMoving = true;
            isMovingUp = true;
        }

        // Update spaceship position and rotation
        if (this.avatar) {
            // Update ship rotation based on movement direction
            this.avatar.rotation.y = this.euler.y;
            
            // Smoother tilting based on movement
            const tiltSpeed = 0.05;
            const maxTilt = 0.1;
            const tiltRecovery = 0.03;

            // Forward/Backward tilt
            if (isMovingForward) {
                this.avatar.rotation.x = THREE.MathUtils.lerp(this.avatar.rotation.x, -maxTilt, tiltSpeed);
            } else if (isMovingBackward) {
                this.avatar.rotation.x = THREE.MathUtils.lerp(this.avatar.rotation.x, maxTilt, tiltSpeed);
            } else if (isMovingDown) {
                this.avatar.rotation.x = THREE.MathUtils.lerp(this.avatar.rotation.x, maxTilt * 0.5, tiltSpeed);
            } else if (isMovingUp) {
                this.avatar.rotation.x = THREE.MathUtils.lerp(this.avatar.rotation.x, -maxTilt * 0.5, tiltSpeed);
            } else {
                this.avatar.rotation.x = THREE.MathUtils.lerp(this.avatar.rotation.x, 0, tiltRecovery);
            }

            // Left/Right banking
            if (isMovingLeft) {
                this.avatar.rotation.z = THREE.MathUtils.lerp(this.avatar.rotation.z, maxTilt, tiltSpeed);
            } else if (isMovingRight) {
                this.avatar.rotation.z = THREE.MathUtils.lerp(this.avatar.rotation.z, -maxTilt, tiltSpeed);
            } else {
                this.avatar.rotation.z = THREE.MathUtils.lerp(this.avatar.rotation.z, 0, tiltRecovery);
            }

            // Smoother bobbing when moving
            if (isMoving) {
                this.avatar.position.y += Math.sin(Date.now() * 0.005) * 0.01; // Reduced frequency and amplitude
            }

            // Smooth camera following
            const cameraOffset = new THREE.Vector3(0, 2, 5);
            cameraOffset.applyQuaternion(this.avatar.quaternion);
            this.targetCameraPosition.copy(this.avatar.position).add(cameraOffset);
            this.targetCameraLookAt.copy(this.avatar.position);

            // Smoothly interpolate camera position and look-at target
            this.camera.position.lerp(this.targetCameraPosition, this.cameraSmoothing);
            this.camera.lookAt(this.targetCameraLookAt);

            // Update coordinate display
            if (this.coordDisplay) {
                const pos = this.avatar.position;
                this.coordDisplay.textContent = `X: ${pos.x.toFixed(2)}\nY: ${pos.y.toFixed(2)}\nZ: ${pos.z.toFixed(2)}`;
            }

            // Send position and gold update to server more frequently
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                const now = Date.now();
                if (now - this.lastUpdate > this.updateInterval) {
                    // Update current player's gold in leaderboard before sending
                    if (this.leaderboardEntries.has(this.playerId)) {
                        this.leaderboardEntries.get(this.playerId).gold = this.gold;
                    }

                    this.ws.send(JSON.stringify({
                        type: 'update',
                        position: {
                            x: this.avatar.position.x,
                            y: this.avatar.position.y,
                            z: this.avatar.position.z
                        },
                        rotation: {
                            x: this.avatar.rotation.x,
                            y: this.avatar.rotation.y,
                            z: this.avatar.rotation.z
                        },
                        gold: this.gold // Add gold to the update
                    }));
                    this.lastUpdate = now;
                }
            }

            // Update flame particles
            if (this.avatar.flames) {
                const isMoving = this.keys.w || this.keys.s || this.keys.a || this.keys.d;
                this.avatar.flames.material.opacity = isMoving ? 1 : 0;

                if (isMoving) {
                    const positions = this.avatar.flamePositions;
                    const colors = this.avatar.flameColors;
                    const sizes = this.avatar.flameSizes;

                    for (let i = 0; i < positions.length; i += 3) {
                        // Update positions - move particles forward (towards camera)
                        positions[i + 2] += Math.random() * 0.1; // Move particles forward
                        if (positions[i + 2] > 1) {
                            positions[i + 2] = 0; // Reset when too far forward
                        }
                        
                        // Randomize x and y slightly
                        positions[i] = (Math.random() - 0.5) * 0.2;
                        positions[i + 1] = (Math.random() - 0.5) * 0.2;
                        
                        // Update colors
                        colors[i + 1] = Math.random() * 0.5; // Vary green component
                        
                        // Update sizes
                        sizes[i / 3] = Math.random() * 0.5 + 0.1;
                    }

                    this.avatar.flames.geometry.attributes.position.needsUpdate = true;
                    this.avatar.flames.geometry.attributes.color.needsUpdate = true;
                    this.avatar.flames.geometry.attributes.size.needsUpdate = true;
                }
            }
        }

        // Check for asteroid collisions
        if (this.avatar) {
            const avatarPosition = this.avatar.position;
            this.scene.traverse((object) => {
                if (object instanceof THREE.Mesh && object.geometry instanceof THREE.IcosahedronGeometry) {
                    const asteroidPosition = object.position;
                    const distance = avatarPosition.distanceTo(asteroidPosition);
                    
                    if (distance < 2) { // Collision threshold
                        this.takeDamage(20); // Take 20 damage on collision
                    }
                }
            });
        }

        // Check and maintain pointer lock more aggressively
        if (now - this.lastPointerLockCheck > 500) { // Check more frequently (every 500ms)
            if (!this.isPointerLocked) {
                this.requestPointerLockWithRetry();
            }
            this.lastPointerLockCheck = now;
        }

        // Handle shooting with improved reliability
        if (this.keys[' ']) { // Space bar to shoot
            const now = Date.now();
            if (now - this.lastShotTime > this.shootCooldown) {
                // Allow shooting even if pointer is temporarily unlocked
                this.createLaser();
                this.lastShotTime = now;
                
                // Update shooting status
                if (this.shootStatusText) {
                    this.shootStatusText.textContent = 'SHOOTING: READY';
                    this.shootStatusText.style.color = '#00ff00';
                }
                
                // Try to regain pointer lock if lost
                if (!this.isPointerLocked) {
                    this.requestPointerLockWithRetry();
                }
            }
        } else {
            // Reset shooting status
            if (this.shootStatusText) {
                this.shootStatusText.textContent = 'SHOOTING: READY';
                this.shootStatusText.style.color = '#00ff00';
            }
        }

        // Update lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            
            // Move laser in its direction
            laser.position.addScaledVector(laser.direction, this.laserSpeed);

            // Remove lasers that have gone too far
            if (laser.position.length() > 100) {
                this.scene.remove(laser);
                this.lasers.splice(i, 1);
            }
        }

        // Update monsters
        this.updateMonsters();

        // Update leaderboard more frequently
        this.updateLeaderboard();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }
} 