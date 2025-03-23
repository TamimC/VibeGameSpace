import * as THREE from 'three';

export class Game {
    constructor() {
        // Remove the promise-based approach and let showNameDialog handle initialization
        this.showNameDialog();
        
        // Add gun state tracking
        this.lastGunCheck = 0;
        this.gunCheckInterval = 1000; // Check every second
        this.gunState = {
            isWorking: true,
            lastWorkingTime: Date.now(),
            consecutiveFailures: 0
        };
        
        // Add laser management
        this.maxLasers = 50; // Limit the number of active lasers
        this.forcedGunResetTimer = 0; // Timer to force reset gun system periodically
        this.lastSuccessfulShot = Date.now(); // Track successful shots
        this.shotCount = 0; // Count shots fired since last reset
        this.maxShotsBeforeReset = 20; // Force a gun system reset after this many shots

        // Add shop variables
        this.maxShields = 100;
        this.currentShields = 0;
        this.shieldsBar = null;
        this.shieldsText = null;
        this.shopVisible = false;
        this.selectedShopItemIndex = 0; // Track selected shop item
        this.shopItems = []; // Store shop item references
        
        // Item prices
        this.shieldPrice = 50;
        this.healthPackPrice = 20;
        this.healthPackAmount = 25; // Amount of health restored per health pack
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
            if (key === ' ') {  // Space bar
                this.tryShoot();
            }
            if (key === 'shift') {
                this.keys.shift = true;
            }
            if (key === 'b') {  // B key to toggle shop
                this.toggleShop();
            }
        });

        window.addEventListener('keyup', (event) => {
            const key = event.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = false;
            }
            if (key === 'shift') {
                this.keys.shift = false;
                this.isUsingNitros = false;
            }
        });

        // Mouse movement controls
        document.addEventListener('mousemove', (e) => {
            if (this.isPointerLocked) {
                this.euler.setFromQuaternion(this.camera.quaternion);
                this.euler.y -= e.movementX * this.mouseSensitivity;
                this.euler.x -= e.movementY * this.mouseSensitivity;
                this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
                this.camera.quaternion.setFromEuler(this.euler);
            }
        });

        // Pointer lock change handler
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === document.body;
            if (!this.isPointerLocked) {
                this.requestPointerLockWithRetry();
            }
        });

        // Click to shoot (alternative to spacebar)
        document.addEventListener('click', () => {
            if (!this.isPointerLocked) {
                this.requestPointerLockWithRetry();
            }
            this.tryShoot();
        });

        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.requestPointerLockWithRetry();
            }
        });

        // Handle focus change
        window.addEventListener('focus', () => {
            this.requestPointerLockWithRetry();
        });

        // Handle pointer lock errors
        document.addEventListener('pointerlockerror', () => {
            console.log('Pointer lock error - retrying...');
            setTimeout(() => {
                this.requestPointerLockWithRetry();
            }, 1000);
        });

        // Initial pointer lock request
        this.requestPointerLockWithRetry();

        // Regular check for pointer lock
        setInterval(() => {
            const now = Date.now();
            if (!this.isPointerLocked && now - this.lastPointerLockAttempt > 1000) {
                this.requestPointerLockWithRetry();
            }
        }, 1000);

        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Add keyboard navigation for shop
        window.addEventListener('keydown', (event) => {
            if (this.shopVisible) {
                switch (event.key) {
                    case 'ArrowUp':
                        this.selectShopItem(this.selectedShopItemIndex - 1);
                        event.preventDefault();
                        break;
                    case 'ArrowDown':
                        this.selectShopItem(this.selectedShopItemIndex + 1);
                        event.preventDefault();
                        break;
                    case 'Enter':
                        this.purchaseSelectedItem();
                        event.preventDefault();
                        break;
                }
            }
        });
    }

    requestPointerLockWithRetry() {
        const now = Date.now();
        if (!this.isPointerLocked && now - this.lastPointerLockAttempt > 1000) {
            this.lastPointerLockAttempt = now;
            document.body.requestPointerLock();
            
            // Reset attempts counter after a delay
            setTimeout(() => {
                this.pointerLockAttempts = 0;
            }, 5000);
        }
    }

    tryShoot() {
        const now = Date.now();
        
        // Force gun reset if we've fired too many shots
        if (this.shotCount >= this.maxShotsBeforeReset) {
            console.log(`Forced gun reset after ${this.shotCount} shots`);
            this.resetGunSystem();
            return;
        }
        
        // Normal gun checks
        if (now - this.lastGunCheck > this.gunCheckInterval) {
            this.checkGunState();
            this.lastGunCheck = now;
        }

        // Only attempt to shoot if gun is working and not on cooldown
        if (this.gunState.isWorking && now - this.lastShotTime > this.shootCooldown) {
            console.log('Creating laser...');
            
            // Limit the number of active lasers to prevent performance issues
            if (this.lasers.length >= this.maxLasers) {
                console.log(`Too many lasers (${this.lasers.length}), removing oldest`);
                const oldestLaser = this.lasers.shift();
                this.scene.remove(oldestLaser);
            }
            
            try {
                this.createLaser();
                this.lastShotTime = now;
                this.lastSuccessfulShot = now;
                this.shotCount++;
                
                // Update shooting status
                if (this.shootStatusText) {
                    this.shootStatusText.textContent = 'SHOOTING: COOLDOWN';
                    this.shootStatusText.style.color = '#ff0000';
                    setTimeout(() => {
                        if (this.gunState.isWorking) {
                            this.shootStatusText.textContent = 'SHOOTING: READY';
                            this.shootStatusText.style.color = '#00ff00';
                        }
                    }, this.shootCooldown);
                }
                
                // Force gun system reset every 5 seconds during intense battles
                if (now - this.forcedGunResetTimer > 5000) {
                    this.forcedGunResetTimer = now;
                    this.resetGunSystem(false); // Silent reset
                }
            } catch (error) {
                console.error('Error creating laser:', error);
                this.gunState.isWorking = false;
                this.attemptGunRecovery();
            }
        } else if (!this.gunState.isWorking) {
            console.log('Gun not working:', {
                consecutiveFailures: this.gunState.consecutiveFailures,
                lastWorkingTime: this.gunState.lastWorkingTime,
                timeSinceLastWorking: now - this.gunState.lastWorkingTime
            });
            
            // Show warning if gun is not working
            if (this.shootStatusText) {
                this.shootStatusText.textContent = 'SHOOTING: SYSTEM ERROR';
                this.shootStatusText.style.color = '#ff0000';
            }
            
            // Force gun recovery
            this.attemptGunRecovery();
        }
    }

    resetGunSystem(showNotification = true) {
        console.log('Resetting gun system');
        
        // Reset gun state
        this.gunState.isWorking = true;
        this.gunState.consecutiveFailures = 0;
        this.gunState.lastWorkingTime = Date.now();
        
        // Reset shot counter
        this.shotCount = 0;
        
        // Reset pointerlock if needed
        if (!this.isPointerLocked) {
            document.body.requestPointerLock();
        }
        
        // Request animation frame to ensure smooth transitions
        requestAnimationFrame(() => {
            // Clear all lasers to free up resources
            for (const laser of this.lasers) {
                this.scene.remove(laser);
            }
            this.lasers = [];
            
            // Update UI
            if (this.shootStatusText) {
                this.shootStatusText.textContent = 'SHOOTING: READY';
                this.shootStatusText.style.color = '#00ff00';
            }
            
            if (showNotification) {
                this.showNotification('Gun system reset', '#00ff00');
            }
        });
    }

    checkGunState() {
        const now = Date.now();
        
        // Check for long time without successful shots
        if (this.gunState.isWorking && now - this.lastSuccessfulShot > 5000) {
            console.log('No successful shots for 5 seconds, forcing gun reset');
            this.resetGunSystem();
            return;
        }
        
        // Check if pointer lock is active
        if (!this.isPointerLocked) {
            this.gunState.consecutiveFailures++;
            
            if (this.gunState.consecutiveFailures >= 3) {
                this.gunState.isWorking = false;
                this.gunState.lastWorkingTime = now;
                console.log('Gun system error detected, attempting recovery');
                this.showNotification('Gun system error: Attempting recovery...', '#ff0000');
                this.attemptGunRecovery();
            }
        } else {
            // Reset failure counter if pointer lock is active
            if (this.gunState.consecutiveFailures > 0) {
                console.log('Pointer lock regained, resetting failure counter');
            }
            this.gunState.consecutiveFailures = 0;
            if (!this.gunState.isWorking) {
                this.gunState.isWorking = true;
                console.log('Gun system recovered');
                if (this.shootStatusText) {
                    this.shootStatusText.textContent = 'SHOOTING: READY';
                    this.shootStatusText.style.color = '#00ff00';
                }
                this.showNotification('Gun system recovered', '#00ff00');
            }
        }
    }

    attemptGunRecovery() {
        console.log('Starting gun recovery process');
        
        // Force pointer lock request
        document.body.requestPointerLock();
        
        // Reset camera and ship
        this.euler.set(0, 0, 0);
        this.camera.quaternion.setFromEuler(this.euler);
        
        if (this.avatar) {
            this.avatar.rotation.set(0, 0, 0);
        }
        
        // Reset camera position
        this.targetCameraPosition.set(0, 2, 5);
        this.targetCameraLookAt.set(0, 0, 0);
        
        // Clear all lasers
        for (const laser of this.lasers) {
            this.scene.remove(laser);
        }
        this.lasers = [];
        
        // Reset shot counter
        this.shotCount = 0;
        
        // Reset state
        this.gunState.isWorking = true;
        this.gunState.consecutiveFailures = 0;
        
        // Update UI
        if (this.shootStatusText) {
            this.shootStatusText.textContent = 'SHOOTING: READY';
            this.shootStatusText.style.color = '#00ff00';
        }
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
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.avatar.quaternion);
        laser.direction = direction;
        
        this.scene.add(laser);
        this.lasers.push(laser);
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
                    case 'playerDamage':
                        if (data.targetId === this.playerId) {
                            // We got hit!
                            this.takeDamage(data.damage);
                            // Show hit notification
                            this.showNotification(`Hit by ${data.attackerName || 'another player'}!`, '#ff0000');
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
        
        // Use the player's chosen color for their ship
        otherAvatar.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const material = child.material;
                if (material) {
                    material.color.set(data.color || '#ffffff');
                    if (material.emissive) {
                        material.emissive.set(data.color || '#ffffff');
                    }
                }
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

        // Create shields container (below health)
        const shieldsContainer = document.createElement('div');
        shieldsContainer.style.position = 'absolute';
        shieldsContainer.style.top = '160px'; // Below health
        shieldsContainer.style.left = '20px';
        shieldsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        shieldsContainer.style.padding = '10px';
        shieldsContainer.style.borderRadius = '5px';
        shieldsContainer.style.color = '#ffffff';
        shieldsContainer.style.fontFamily = 'monospace';
        shieldsContainer.style.fontSize = '16px';
        shieldsContainer.style.minWidth = '200px';
        document.body.appendChild(shieldsContainer);

        // Create shields text
        this.shieldsText = document.createElement('div');
        this.shieldsText.textContent = 'SHIELDS: 0/100';
        shieldsContainer.appendChild(this.shieldsText);

        // Create shields bar
        const shieldsBarContainer = document.createElement('div');
        shieldsBarContainer.style.width = '100%';
        shieldsBarContainer.style.height = '20px';
        shieldsBarContainer.style.backgroundColor = '#333';
        shieldsBarContainer.style.borderRadius = '10px';
        shieldsBarContainer.style.overflow = 'hidden';
        shieldsBarContainer.style.marginTop = '5px';
        shieldsContainer.appendChild(shieldsBarContainer);

        this.shieldsBar = document.createElement('div');
        this.shieldsBar.style.width = '0%'; // Start with 0 shields
        this.shieldsBar.style.height = '100%';
        this.shieldsBar.style.backgroundColor = '#4287f5'; // Blue for shields
        this.shieldsBar.style.transition = 'width 0.3s ease-in-out';
        shieldsBarContainer.appendChild(this.shieldsBar);

        // Create shooting status display
        const shootStatusContainer = document.createElement('div');
        shootStatusContainer.style.position = 'absolute';
        shootStatusContainer.style.top = '230px'; // Adjusted position below shields
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

        // Add shop button in gold container
        const shopButton = document.createElement('button');
        shopButton.textContent = 'SHOP';
        shopButton.style.marginTop = '10px';
        shopButton.style.padding = '5px 10px';
        shopButton.style.backgroundColor = '#ffd700';
        shopButton.style.color = '#000000';
        shopButton.style.border = 'none';
        shopButton.style.borderRadius = '5px';
        shopButton.style.cursor = 'pointer';
        shopButton.style.fontFamily = 'monospace';
        shopButton.style.fontSize = '14px';
        shopButton.style.fontWeight = 'bold';
        shopButton.onclick = () => this.toggleShop();
        goldContainer.appendChild(shopButton);

        // Create shop container
        this.shopContainer = document.createElement('div');
        this.shopContainer.style.position = 'absolute';
        this.shopContainer.style.bottom = '100px'; // Position at bottom middle
        this.shopContainer.style.left = '50%';
        this.shopContainer.style.transform = 'translateX(-50%)';
        this.shopContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.shopContainer.style.padding = '15px';
        this.shopContainer.style.borderRadius = '10px';
        this.shopContainer.style.border = '2px solid #ffd700';
        this.shopContainer.style.color = '#ffffff';
        this.shopContainer.style.fontFamily = 'monospace';
        this.shopContainer.style.fontSize = '16px';
        this.shopContainer.style.minWidth = '300px';
        this.shopContainer.style.display = 'none'; // Hidden by default
        this.shopContainer.style.zIndex = '1000';
        document.body.appendChild(this.shopContainer);

        // Add shop title
        const shopTitle = document.createElement('div');
        shopTitle.textContent = 'SHIP UPGRADES';
        shopTitle.style.textAlign = 'center';
        shopTitle.style.color = '#ffd700';
        shopTitle.style.fontSize = '20px';
        shopTitle.style.marginBottom = '15px';
        this.shopContainer.appendChild(shopTitle);

        // Add shop items container
        const itemsContainer = document.createElement('div');
        itemsContainer.style.display = 'flex';
        itemsContainer.style.flexDirection = 'column';
        itemsContainer.style.gap = '10px';
        this.shopContainer.appendChild(itemsContainer);

        // Add shield item
        this.addShopItem(
            itemsContainer, 
            'Shield Recharge', 
            `Cost: ${this.shieldPrice} gold`, 
            'Recharges shields to full capacity',
            () => this.buyShields()
        );

        // Add health pack item
        this.addShopItem(
            itemsContainer, 
            'Health Pack', 
            `Cost: ${this.healthPackPrice} gold`, 
            `Restores ${this.healthPackAmount} health points`,
            () => this.buyHealthPack()
        );

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'CLOSE';
        closeButton.style.marginTop = '15px';
        closeButton.style.padding = '8px';
        closeButton.style.backgroundColor = '#333';
        closeButton.style.color = '#fff';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.width = '100%';
        closeButton.onclick = () => this.toggleShop();
        this.shopContainer.appendChild(closeButton);

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
        this.leaderboardContainer.style.bottom = '20px';  // Changed from top to bottom
        this.leaderboardContainer.style.right = '20px';
        this.leaderboardContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.leaderboardContainer.style.padding = '10px';
        this.leaderboardContainer.style.borderRadius = '5px';
        this.leaderboardContainer.style.color = '#ffffff';
        this.leaderboardContainer.style.fontFamily = 'monospace';
        this.leaderboardContainer.style.fontSize = '16px';
        this.leaderboardContainer.style.minWidth = '200px';
        this.leaderboardContainer.style.zIndex = '1000';  // Added to ensure it's above other elements
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

    addShopItem(container, title, cost, description, buyFunction) {
        const itemContainer = document.createElement('div');
        itemContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        itemContainer.style.padding = '10px';
        itemContainer.style.borderRadius = '5px';
        itemContainer.style.display = 'flex';
        itemContainer.style.justifyContent = 'space-between';
        itemContainer.style.alignItems = 'center';
        itemContainer.style.transition = 'background-color 0.2s ease-in-out';
        
        // Store the original background color
        itemContainer.dataset.normalBg = 'rgba(255, 255, 255, 0.1)';
        itemContainer.dataset.selectedBg = 'rgba(255, 215, 0, 0.3)';

        const itemInfo = document.createElement('div');
        itemInfo.style.flex = '1';

        const itemTitle = document.createElement('div');
        itemTitle.textContent = title;
        itemTitle.style.fontWeight = 'bold';
        itemTitle.style.color = '#fff';
        itemInfo.appendChild(itemTitle);

        const itemCost = document.createElement('div');
        itemCost.textContent = cost;
        itemCost.style.color = '#ffd700';
        itemInfo.appendChild(itemCost);

        const itemDesc = document.createElement('div');
        itemDesc.textContent = description;
        itemDesc.style.fontSize = '12px';
        itemDesc.style.opacity = '0.7';
        itemInfo.appendChild(itemDesc);

        const buyButton = document.createElement('button');
        buyButton.textContent = 'BUY';
        buyButton.style.padding = '5px 15px';
        buyButton.style.backgroundColor = '#ffd700';
        buyButton.style.color = '#000';
        buyButton.style.border = 'none';
        buyButton.style.borderRadius = '5px';
        buyButton.style.cursor = 'pointer';
        buyButton.style.fontWeight = 'bold';
        buyButton.style.marginLeft = '10px';
        buyButton.onclick = buyFunction;

        itemContainer.appendChild(itemInfo);
        itemContainer.appendChild(buyButton);
        container.appendChild(itemContainer);
        
        // Store reference to the item and its purchase function
        this.shopItems.push({
            element: itemContainer,
            buyButton: buyButton,
            buyFunction: buyFunction
        });

        return itemContainer;
    }

    toggleShop() {
        this.shopVisible = !this.shopVisible;
        this.shopContainer.style.display = this.shopVisible ? 'block' : 'none';
        
        // Reset selection when opening shop
        if (this.shopVisible) {
            this.selectShopItem(0);
            this.showNotification('Shop opened (press B to close, use arrow keys to navigate)', '#ffd700');
        }
    }

    buyShields() {
        if (this.gold >= this.shieldPrice) {
            // Deduct gold
            this.gold -= this.shieldPrice;
            this.goldDisplay.textContent = `Gold: ${this.gold}`;
            
            // Add full shields
            this.currentShields = this.maxShields;
            
            // Update shields UI
            const shieldsPercent = (this.currentShields / this.maxShields) * 100;
            this.shieldsBar.style.width = `${shieldsPercent}%`;
            this.shieldsText.textContent = `SHIELDS: ${this.currentShields}/${this.maxShields}`;
            
            // Show confirmation
            this.showNotification('Shields recharged to full capacity!', '#4287f5');
            
            // Update leaderboard with new gold amount
            if (this.leaderboardEntries.has(this.playerId)) {
                this.leaderboardEntries.get(this.playerId).gold = this.gold;
            }
        } else {
            // Show error
            this.showNotification('Not enough gold for shields!', '#ff0000');
        }
    }

    buyHealthPack() {
        if (this.gold >= this.healthPackPrice) {
            // Check if health is already full
            if (this.currentHealth >= this.maxHealth) {
                this.showNotification('Health already at maximum!', '#ff0000');
                return;
            }
            
            // Deduct gold
            this.gold -= this.healthPackPrice;
            this.goldDisplay.textContent = `Gold: ${this.gold}`;
            
            // Add health
            this.currentHealth = Math.min(this.maxHealth, this.currentHealth + this.healthPackAmount);
            
            // Update health UI
            const healthPercent = (this.currentHealth / this.maxHealth) * 100;
            this.healthBar.style.width = `${healthPercent}%`;
            this.healthText.textContent = `HP: ${this.currentHealth}/${this.maxHealth}`;
            
            // Update health bar color
            if (healthPercent > 60) {
                this.healthBar.style.backgroundColor = '#00ff00';
            } else if (healthPercent > 30) {
                this.healthBar.style.backgroundColor = '#ffff00';
            } else {
                this.healthBar.style.backgroundColor = '#ff0000';
            }
            
            // Show confirmation
            this.showNotification('Health pack applied!', '#00ff00');
            
            // Update leaderboard with new gold amount
            if (this.leaderboardEntries.has(this.playerId)) {
                this.leaderboardEntries.get(this.playerId).gold = this.gold;
            }
        } else {
            // Show error
            this.showNotification('Not enough gold for health pack!', '#ff0000');
        }
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

        // Check if we have shields
        if (this.currentShields > 0) {
            // Calculate how much damage shields absorb
            const shieldDamage = Math.min(this.currentShields, amount);
            const healthDamage = amount - shieldDamage;
            
            // Apply damage to shields
            this.currentShields -= shieldDamage;
            
            // Update shields bar
            const shieldsPercent = (this.currentShields / this.maxShields) * 100;
            this.shieldsBar.style.width = `${shieldsPercent}%`;
            this.shieldsText.textContent = `SHIELDS: ${this.currentShields}/${this.maxShields}`;
            
            // Apply remaining damage to health
            if (healthDamage > 0) {
                this.currentHealth = Math.max(0, this.currentHealth - healthDamage);
            }
        } else {
            // No shields, apply full damage to health
            this.currentHealth = Math.max(0, this.currentHealth - amount);
        }

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
            // Notify other players of death
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'playerDied',
                    playerId: this.playerId
                }));
            }
        }
    }

    handleDeath() {
        // Show death message
        this.showNotification('You were destroyed! Respawning...', '#ff0000');
        
        // Reset position to a random spawn point
        const spawnRadius = 30;
        this.avatar.position.set(
            (Math.random() - 0.5) * spawnRadius,
            (Math.random() - 0.5) * spawnRadius,
            (Math.random() - 0.5) * spawnRadius
        );
        
        // Reset health
        this.currentHealth = this.maxHealth;
        this.healthBar.style.width = '100%';
        this.healthBar.style.backgroundColor = '#00ff00';
        this.healthText.textContent = `HP: ${this.currentHealth}/${this.maxHealth}`;
        
        // Reset shields
        this.currentShields = 0;
        this.shieldsBar.style.width = '0%';
        this.shieldsText.textContent = `SHIELDS: ${this.currentShields}/${this.maxShields}`;
        
        // Ensure pointer lock is maintained
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

        // Handle nitros with improved timing and reliability
        const now = Date.now();
        if (now - this.lastNitrosUpdate >= this.nitrosUpdateInterval) {
            if (this.keys.shift && this.currentNitros > 0) {
                this.isUsingNitros = true;
                this.currentNitros = Math.max(0, this.currentNitros - this.nitrosDrainRate);
            } else if (!this.keys.shift) {
                this.isUsingNitros = false;
                if (this.currentNitros < this.maxNitros) {
                    this.currentNitros = Math.min(this.maxNitros, this.currentNitros + this.nitrosRechargeRate);
                }
            }

            // Update nitros UI
            if (this.nitrosBar && this.nitrosText) {
                const nitrosPercent = (this.currentNitros / this.maxNitros) * 100;
                this.nitrosBar.style.width = `${nitrosPercent}%`;
                this.nitrosText.textContent = `NITROS: ${Math.round(this.currentNitros)}/${this.maxNitros}`;
                
                // Update nitros bar color
                if (nitrosPercent < 20) {
                    this.nitrosBar.style.backgroundColor = '#ff0000';
                } else if (nitrosPercent < 50) {
                    this.nitrosBar.style.backgroundColor = '#ffff00';
                } else {
                    this.nitrosBar.style.backgroundColor = '#00ffff';
                }
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
                        
                        // Update colors based on nitros state
                        if (this.isUsingNitros) {
                            // Blue flame colors for nitros
                            colors[i] = 0.1; // Low red
                            colors[i + 1] = 0.5 + Math.random() * 0.3; // Medium-high green (for cyan)
                            colors[i + 2] = 0.8 + Math.random() * 0.2; // High blue
                        } else {
                            // Regular red-yellow flame colors
                            colors[i] = 1; // Full red
                            colors[i + 1] = Math.random() * 0.5; // Vary green component
                            colors[i + 2] = 0; // No blue
                        }
                        
                        // Update sizes - larger for nitros
                        sizes[i / 3] = Math.random() * 0.5 + (this.isUsingNitros ? 0.3 : 0.1);
                    }

                    this.avatar.flames.geometry.attributes.position.needsUpdate = true;
                    this.avatar.flames.geometry.attributes.color.needsUpdate = true;
                    this.avatar.flames.geometry.attributes.size.needsUpdate = true;
                }
            }

            // Also update engine exhaust color based on nitros
            if (this.avatar) {
                this.avatar.traverse((child) => {
                    if (child instanceof THREE.Mesh && child.material && child.material.emissive) {
                        // Check if this is the engine exhaust
                        const isExhaust = child.position.z < -0.5 && child.material.emissive.r > 0.5;
                        if (isExhaust) {
                            if (this.isUsingNitros) {
                                // Blue exhaust for nitros
                                child.material.color.set(0x0088ff);
                                child.material.emissive.set(0x0088ff);
                            } else {
                                // Regular orange exhaust
                                child.material.color.set(0xff3300);
                                child.material.emissive.set(0xff3300);
                            }
                        }
                    }
                });
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

        // Update shooting status text color based on cooldown
        const timeSinceLastShot = Date.now() - this.lastShotTime;
        if (timeSinceLastShot < this.shootCooldown) {
            this.shootStatusText.style.color = '#ff0000';
        } else {
            this.shootStatusText.style.color = '#00ff00';
        }

        // Update lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            
            // Move laser in its direction
            laser.position.addScaledVector(laser.direction, this.laserSpeed);

            // Check for collisions with other players
            this.otherPlayers.forEach((otherPlayer, playerId) => {
                const distance = laser.position.distanceTo(otherPlayer.position);
                if (distance < 2) { // Collision threshold
                    // Remove the laser
                    this.scene.remove(laser);
                    this.lasers.splice(i, 1);

                    // Send damage message to server
                    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                        this.ws.send(JSON.stringify({
                            type: 'playerDamage',
                            targetId: playerId,
                            damage: 20,
                            attackerName: this.playerName
                        }));
                    }

                    // Show hit marker notification
                    this.showNotification('Hit!', '#ff0000');
                }
            });

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

        // Add gun state check to the update loop
        if (now - this.lastGunCheck > this.gunCheckInterval) {
            this.checkGunState();
            this.lastGunCheck = now;
        }

        // Clean up old lasers periodically to prevent memory issues
        if (this.lasers.length > 0) {
            const maxLaserAge = 5000; // 5 seconds
            let removedCount = 0;
            
            // Remove lasers that have been around too long
            for (let i = this.lasers.length - 1; i >= 0; i--) {
                const laser = this.lasers[i];
                
                if (!laser.creationTime) {
                    laser.creationTime = now;
                }
                
                if (now - laser.creationTime > maxLaserAge) {
                    this.scene.remove(laser);
                    this.lasers.splice(i, 1);
                    removedCount++;
                }
            }
            
            if (removedCount > 0) {
                console.log(`Removed ${removedCount} old lasers, ${this.lasers.length} remaining`);
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }

    selectShopItem(index) {
        // Ensure index is within bounds
        index = Math.max(0, Math.min(index, this.shopItems.length - 1));
        
        // Reset previous selection
        if (this.selectedShopItemIndex >= 0 && this.selectedShopItemIndex < this.shopItems.length) {
            const prevItem = this.shopItems[this.selectedShopItemIndex].element;
            prevItem.style.backgroundColor = prevItem.dataset.normalBg;
            prevItem.style.border = 'none';
        }
        
        // Set new selection
        this.selectedShopItemIndex = index;
        
        // Highlight new selection
        if (this.selectedShopItemIndex >= 0 && this.selectedShopItemIndex < this.shopItems.length) {
            const currentItem = this.shopItems[this.selectedShopItemIndex].element;
            currentItem.style.backgroundColor = currentItem.dataset.selectedBg;
            currentItem.style.border = '2px solid #ffd700';
        }
    }
    
    purchaseSelectedItem() {
        if (this.selectedShopItemIndex >= 0 && this.selectedShopItemIndex < this.shopItems.length) {
            const selectedItem = this.shopItems[this.selectedShopItemIndex];
            selectedItem.buyFunction();
        }
    }
} 