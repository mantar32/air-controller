// Controller logic
// Socket.IO backend URL - Render.com server
const SOCKET_URL = 'https://air-controller.onrender.com';

class ControllerApp {
    constructor() {
        this.socket = io(SOCKET_URL);
        this.roomCode = null;
        this.player = null;
        this.currentGame = null;
        this.controlMode = 'joystick'; // 'joystick', 'arrows', 'tilt'

        this.screens = {
            code: document.getElementById('code-screen'),
            waiting: document.getElementById('waiting-screen'),
            controller: document.getElementById('controller-screen')
        };

        // Input state
        this.inputState = {
            joystickX: 0,
            joystickY: 0,
            up: false,
            down: false,
            left: false,
            right: false,
            buttonA: false,
            buttonB: false
        };

        this.init();
    }

    init() {
        this.setupCodeEntry();
        this.setupSocketEvents();
        this.setupJoystick();
        this.setupButtons();
        this.setupControlModes();
        this.setupArrowButtons();
        this.setupTiltControl();
    }

    // ===================================
    // Code Entry
    // ===================================
    setupCodeEntry() {
        const inputs = document.querySelectorAll('.code-digit');

        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                if (value && index < 3) {
                    inputs[index + 1].focus();
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    inputs[index - 1].focus();
                }
            });
        });

        // Auto-focus first input
        inputs[0].focus();

        // Connect button
        document.getElementById('btn-connect').addEventListener('click', () => {
            this.connect();
        });
    }

    connect() {
        const inputs = document.querySelectorAll('.code-digit');
        const code = Array.from(inputs).map(i => i.value).join('');

        if (code.length !== 4) {
            this.showError('4 haneli kodu girin');
            return;
        }

        const playerName = document.getElementById('player-name').value.trim() || 'Oyuncu';

        this.socket.emit('join-room', { roomCode: code, playerName }, (response) => {
            if (response.success) {
                this.roomCode = code;
                this.player = response.player;

                if (response.currentGame) {
                    this.currentGame = response.currentGame;
                    this.showController();
                } else {
                    this.showWaiting();
                }

                // Vibrate on success
                this.vibrate(100);
            } else {
                this.showError(response.error === 'Room not found' ? 'Oda bulunamadı' : response.error);
            }
        });
    }

    showError(message) {
        const errorEl = document.getElementById('error-message');
        errorEl.textContent = message;
        setTimeout(() => errorEl.textContent = '', 3000);
    }

    // ===================================
    // Screens
    // ===================================
    showScreen(name) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        this.screens[name].classList.add('active');
    }

    showWaiting() {
        document.getElementById('my-avatar').textContent = this.player.number;
        document.getElementById('my-avatar').style.background = this.player.color;
        document.getElementById('my-name').textContent = this.player.name;
        this.showScreen('waiting');
    }

    showController() {
        this.showScreen('controller');
        this.vibrate(50);
    }

    // ===================================
    // Socket Events
    // ===================================
    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            if (this.roomCode && this.player) {
                console.log('Rejoining room...', this.roomCode);
                this.socket.emit('join-room', { roomCode: this.roomCode, playerName: this.player.name }, (response) => {
                    if (response.success) {
                        this.player = response.player; // Update player info (might be new ID)
                        if (response.currentGame) {
                            this.currentGame = response.currentGame;
                            this.showController();
                        } else {
                            this.showWaiting();
                        }
                    } else {
                        // If room no longer exists or error, reset
                        this.roomCode = null;
                        this.player = null;
                        this.showScreen('code');
                        this.showError('Bağlantı yenilendi, lütfen tekrar giriş yapın.');
                    }
                });
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        this.socket.on('game-started', (gameId) => {
            this.currentGame = gameId;
            this.showController();
        });

        this.socket.on('game-ended', () => {
            this.currentGame = null;
            this.showWaiting();
        });

        this.socket.on('room-closed', () => {
            alert('Oda kapatıldı!');
            location.reload();
        });

        this.socket.on('game-state', (state) => {
            // Handle game state updates from screen
            if (state.type === 'player-accepted') {
                this.vibrate(100);
            }
        });
    }

    // ===================================
    // Joystick
    // ===================================
    setupJoystick() {
        const joystickZone = document.getElementById('joystick-zone');
        const joystick = document.getElementById('joystick');
        const base = document.querySelector('.joystick-base');

        let isDragging = false;
        let centerX = 0;
        let centerY = 0;
        const maxDistance = 55;

        const updateCenter = () => {
            const rect = base.getBoundingClientRect();
            centerX = rect.left + rect.width / 2;
            centerY = rect.top + rect.height / 2;
        };

        const handleStart = (e) => {
            isDragging = true;
            joystick.classList.add('active');
            updateCenter();
            handleMove(e);
        };

        const handleMove = (e) => {
            if (!isDragging) return;

            e.preventDefault();

            const touch = e.touches ? e.touches[0] : e;
            let dx = touch.clientX - centerX;
            let dy = touch.clientY - centerY;

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > maxDistance) {
                dx = (dx / distance) * maxDistance;
                dy = (dy / distance) * maxDistance;
            }

            joystick.style.transform = `translate(${dx}px, ${dy}px)`;

            // Normalize to -1 to 1
            this.inputState.joystickX = dx / maxDistance;
            this.inputState.joystickY = dy / maxDistance;

            // Update directional states
            this.inputState.left = this.inputState.joystickX < -0.5;
            this.inputState.right = this.inputState.joystickX > 0.5;
            this.inputState.up = this.inputState.joystickY < -0.5;
            this.inputState.down = this.inputState.joystickY > 0.5;

            this.sendInput();
        };

        const handleEnd = () => {
            isDragging = false;
            joystick.classList.remove('active');
            joystick.style.transform = 'translate(0, 0)';

            this.inputState.joystickX = 0;
            this.inputState.joystickY = 0;
            this.inputState.left = false;
            this.inputState.right = false;
            this.inputState.up = false;
            this.inputState.down = false;

            this.sendInput();
        };

        // Touch events
        joystickZone.addEventListener('touchstart', handleStart, { passive: false });
        joystickZone.addEventListener('touchmove', handleMove, { passive: false });
        joystickZone.addEventListener('touchend', handleEnd);
        joystickZone.addEventListener('touchcancel', handleEnd);

        // Mouse events (for testing)
        joystickZone.addEventListener('mousedown', handleStart);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
    }

    // ===================================
    // Buttons
    // ===================================
    setupButtons() {
        const btnA = document.getElementById('btn-a');
        const btnB = document.getElementById('btn-b');

        const handleButton = (btn, key, pressed) => {
            this.inputState[key] = pressed;
            if (pressed) {
                this.vibrate(30);
            }
            this.sendInput();
        };

        // Button A
        btnA.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleButton(btnA, 'buttonA', true);
        });
        btnA.addEventListener('touchend', () => handleButton(btnA, 'buttonA', false));
        btnA.addEventListener('mousedown', () => handleButton(btnA, 'buttonA', true));
        btnA.addEventListener('mouseup', () => handleButton(btnA, 'buttonA', false));

        // Button B
        btnB.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleButton(btnB, 'buttonB', true);
        });
        btnB.addEventListener('touchend', () => handleButton(btnB, 'buttonB', false));
        btnB.addEventListener('mousedown', () => handleButton(btnB, 'buttonB', true));
        btnB.addEventListener('mouseup', () => handleButton(btnB, 'buttonB', false));
    }

    // ===================================
    // Input Sending
    // ===================================
    sendInput() {
        if (!this.currentGame) return;

        this.socket.emit('controller-input', {
            joystickX: this.inputState.joystickX,
            joystickY: this.inputState.joystickY,
            up: this.inputState.up,
            down: this.inputState.down,
            left: this.inputState.left,
            right: this.inputState.right,
            buttonA: this.inputState.buttonA,
            buttonB: this.inputState.buttonB
        });
    }

    // ===================================
    // Vibration
    // ===================================
    vibrate(duration) {
        if (navigator.vibrate) {
            navigator.vibrate(duration);
        }
    }

    // ===================================
    // Control Mode Switching
    // ===================================
    setupControlModes() {
        const modeButtons = document.querySelectorAll('.mode-btn');
        const joystickZone = document.getElementById('joystick-zone');
        const arrowButtons = document.getElementById('arrow-buttons');
        const tiltContainer = document.getElementById('tilt-container');

        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.controlMode = mode;

                // Update button states
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Show/hide control elements
                joystickZone.classList.toggle('hidden', mode !== 'joystick');
                arrowButtons.classList.toggle('hidden', mode !== 'arrows');
                tiltContainer.classList.toggle('hidden', mode !== 'tilt');

                // Stop tilt listening if not in tilt mode
                if (mode === 'tilt') {
                    this.startTiltListening();
                } else {
                    this.stopTiltListening();
                }

                // Reset input state
                this.inputState.joystickX = 0;
                this.inputState.joystickY = 0;
                this.inputState.left = false;
                this.inputState.right = false;
                this.sendInput();

                this.vibrate(30);
            });
        });
    }

    // ===================================
    // Arrow Buttons
    // ===================================
    setupArrowButtons() {
        const leftBtn = document.getElementById('arrow-left');
        const rightBtn = document.getElementById('arrow-right');

        const handleArrow = (direction, pressed) => {
            if (direction === 'left') {
                this.inputState.left = pressed;
                this.inputState.joystickX = pressed ? -1 : (this.inputState.right ? 1 : 0);
            } else {
                this.inputState.right = pressed;
                this.inputState.joystickX = pressed ? 1 : (this.inputState.left ? -1 : 0);
            }
            if (pressed) this.vibrate(20);
            this.sendInput();
        };

        // Left button
        leftBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            leftBtn.classList.add('pressed');
            handleArrow('left', true);
        });
        leftBtn.addEventListener('touchend', () => {
            leftBtn.classList.remove('pressed');
            handleArrow('left', false);
        });
        leftBtn.addEventListener('mousedown', () => {
            leftBtn.classList.add('pressed');
            handleArrow('left', true);
        });
        leftBtn.addEventListener('mouseup', () => {
            leftBtn.classList.remove('pressed');
            handleArrow('left', false);
        });

        // Right button  
        rightBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            rightBtn.classList.add('pressed');
            handleArrow('right', true);
        });
        rightBtn.addEventListener('touchend', () => {
            rightBtn.classList.remove('pressed');
            handleArrow('right', false);
        });
        rightBtn.addEventListener('mousedown', () => {
            rightBtn.classList.add('pressed');
            handleArrow('right', true);
        });
        rightBtn.addEventListener('mouseup', () => {
            rightBtn.classList.remove('pressed');
            handleArrow('right', false);
        });
    }

    // ===================================
    // Tilt Control (Gyroscope/Accelerometer)
    // ===================================
    setupTiltControl() {
        this.tiltBall = document.getElementById('tilt-ball');
        this.tiltActive = false;
        this.tiltHandler = null;
    }

    startTiltListening() {
        if (this.tiltActive) return;

        // Request permission on iOS
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permission => {
                    if (permission === 'granted') {
                        this.addTiltListener();
                    }
                })
                .catch(console.error);
        } else {
            this.addTiltListener();
        }
    }

    addTiltListener() {
        this.tiltActive = true;
        this.tiltHandler = (event) => {
            if (this.controlMode !== 'tilt') return;

            // gamma: left/right tilt (-90 to 90)
            let tilt = event.gamma || 0;

            // Clamp and normalize (-30 to 30 degrees maps to -1 to 1)
            tilt = Math.max(-30, Math.min(30, tilt));
            const normalizedTilt = tilt / 30;

            // Update visual indicator
            if (this.tiltBall) {
                const ballPos = 50 + (normalizedTilt * 40); // 10% to 90%
                this.tiltBall.style.left = ballPos + '%';
            }

            // Update input state
            this.inputState.joystickX = normalizedTilt;
            this.inputState.left = normalizedTilt < -0.3;
            this.inputState.right = normalizedTilt > 0.3;

            this.sendInput();
        };

        window.addEventListener('deviceorientation', this.tiltHandler);
    }

    stopTiltListening() {
        if (this.tiltHandler) {
            window.removeEventListener('deviceorientation', this.tiltHandler);
            this.tiltHandler = null;
        }
        this.tiltActive = false;

        // Reset tilt ball position
        if (this.tiltBall) {
            this.tiltBall.style.left = '50%';
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.controller = new ControllerApp();
});
