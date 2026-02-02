// Games configuration
const GAMES = [
    {
        id: 'pong',
        title: 'NEON PONG',
        icon: '🏓',
        category: 'Arcade',
        minPlayers: 2,
        maxPlayers: 2,
        description: 'Klasik tenis oyunu - neon stili!'
    },
    {
        id: 'racing',
        title: 'SPACE RACE',
        icon: '🚀',
        category: 'Racing',
        minPlayers: 1,
        maxPlayers: 4,
        description: 'Uzay yarışı!'
    },
    {
        id: 'snake',
        title: 'SNAKE BATTLE',
        icon: '🐍',
        category: 'Arcade',
        minPlayers: 1,
        maxPlayers: 4,
        description: 'Çok oyunculu yılan!'
    },
    {
        id: 'reflex',
        title: 'REFLEX MASTER',
        icon: '🎯',
        category: 'Arcade',
        minPlayers: 1,
        maxPlayers: 4,
        description: 'Hedefleri vur, hız artar!'
    },
    {
        id: 'cardodge',
        title: 'CAR DODGE',
        icon: '🚗',
        category: 'Racing',
        minPlayers: 1,
        maxPlayers: 4,
        description: 'Engellerden kaç!'
    },
    {
        id: 'puzzle',
        title: 'SPEED PUZZLE',
        icon: '🧩',
        category: 'Puzzle',
        minPlayers: 1,
        maxPlayers: 4,
        description: 'Zaman baskılı bulmaca!'
    },
    {
        id: 'duel',
        title: 'DUEL ARENA',
        icon: '⚔️',
        category: 'Action',
        minPlayers: 2,
        maxPlayers: 2,
        description: '1v1 silah düellosu! Rakibini vur!'
    }
];


// ===================================
// PARTICLE SYSTEM
// ===================================
class Particle {
    constructor(x, y, color, velocity = null) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 4 + 2;
        this.life = 1;
        this.decay = Math.random() * 0.02 + 0.01;

        if (velocity) {
            this.vx = velocity.x + (Math.random() - 0.5) * 3;
            this.vy = velocity.y + (Math.random() - 0.5) * 3;
        } else {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 2;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.vx *= 0.98;
        this.vy *= 0.98;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    isDead() {
        return this.life <= 0;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, color, count = 10, velocity = null) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color, velocity));
        }
    }

    update() {
        this.particles = this.particles.filter(p => {
            p.update();
            return !p.isDead();
        });
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }
}

// ===================================
// ENHANCED PONG GAME
// ===================================
class PongGame {
    constructor(canvas, players, socket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.players = players;
        this.socket = socket;
        this.running = false;

        this.paddleHeight = 120;
        this.paddleWidth = 15;
        this.ballSize = 12;

        this.particles = new ParticleSystem();
        this.trail = [];
        this.maxTrailLength = 20;

        this.reset();
    }

    reset() {
        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            vx: 7 * (Math.random() > 0.5 ? 1 : -1),
            vy: 5 * (Math.random() > 0.5 ? 1 : -1)
        };

        this.paddles = {
            left: { y: this.canvas.height / 2 - this.paddleHeight / 2, score: 0, charging: false },
            right: { y: this.canvas.height / 2 - this.paddleHeight / 2, score: 0, charging: false }
        };

        this.inputs = {};
        this.trail = [];
        this.screenShake = 0;
    }

    start() {
        this.running = true;
        this.gameLoop();
    }

    stop() {
        this.running = false;
    }

    handleInput(input) {
        const side = input.playerNumber === 1 ? 'left' : 'right';
        this.inputs[side] = input;
    }

    gameLoop() {
        if (!this.running) return;
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        const speed = 14;

        // Update paddles
        if (this.inputs.left) {
            if (this.inputs.left.up) this.paddles.left.y -= speed;
            if (this.inputs.left.down) this.paddles.left.y += speed;
            if (this.inputs.left.joystickY !== undefined) {
                this.paddles.left.y += this.inputs.left.joystickY * speed;
            }
        }

        if (this.inputs.right) {
            if (this.inputs.right.up) this.paddles.right.y -= speed;
            if (this.inputs.right.down) this.paddles.right.y += speed;
            if (this.inputs.right.joystickY !== undefined) {
                this.paddles.right.y += this.inputs.right.joystickY * speed;
            }
        }

        // Power shot charging with B button
        if (this.inputs.left) {
            this.paddles.left.charging = this.inputs.left.buttonB;
        }
        if (this.inputs.right) {
            this.paddles.right.charging = this.inputs.right.buttonB;
        }

        // Clamp paddles
        this.paddles.left.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, this.paddles.left.y));
        this.paddles.right.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, this.paddles.right.y));

        // Trail
        this.trail.push({ x: this.ball.x, y: this.ball.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        // Update ball
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        // Wall collision
        if (this.ball.y <= this.ballSize || this.ball.y >= this.canvas.height - this.ballSize) {
            this.ball.vy *= -1;
            this.particles.emit(this.ball.x, this.ball.y, '#ffffff', 8);
        }

        // Paddle collision - Left
        if (this.ball.x <= this.paddleWidth + 35 &&
            this.ball.y >= this.paddles.left.y - 10 &&
            this.ball.y <= this.paddles.left.y + this.paddleHeight + 10 &&
            this.ball.vx < 0) {
            const powerMultiplier = this.paddles.left.charging ? 1.3 : 1.05;
            this.ball.vx = Math.abs(this.ball.vx) * powerMultiplier;
            const hitPos = (this.ball.y - (this.paddles.left.y + this.paddleHeight / 2)) / (this.paddleHeight / 2);
            this.ball.vy = hitPos * (this.paddles.left.charging ? 12 : 8);
            this.particles.emit(this.ball.x, this.ball.y, this.players[0]?.color || '#FF6B6B', this.paddles.left.charging ? 25 : 15, { x: 5, y: 0 });
            this.screenShake = this.paddles.left.charging ? 10 : 5;
        }

        // Paddle collision - Right
        if (this.ball.x >= this.canvas.width - this.paddleWidth - 35 &&
            this.ball.y >= this.paddles.right.y - 10 &&
            this.ball.y <= this.paddles.right.y + this.paddleHeight + 10 &&
            this.ball.vx > 0) {
            const powerMultiplier = this.paddles.right.charging ? 1.3 : 1.05;
            this.ball.vx = -Math.abs(this.ball.vx) * powerMultiplier;
            const hitPos = (this.ball.y - (this.paddles.right.y + this.paddleHeight / 2)) / (this.paddleHeight / 2);
            this.ball.vy = hitPos * (this.paddles.right.charging ? 12 : 8);
            this.particles.emit(this.ball.x, this.ball.y, this.players[1]?.color || '#4ECDC4', this.paddles.right.charging ? 25 : 15, { x: -5, y: 0 });
            this.screenShake = this.paddles.right.charging ? 10 : 5;
        }

        // Scoring
        if (this.ball.x <= 0) {
            this.paddles.right.score++;
            this.particles.emit(this.canvas.width / 4, this.canvas.height / 2, '#FF6B6B', 50);
            this.screenShake = 15;
            this.resetBall();
        } else if (this.ball.x >= this.canvas.width) {
            this.paddles.left.score++;
            this.particles.emit(3 * this.canvas.width / 4, this.canvas.height / 2, '#4ECDC4', 50);
            this.screenShake = 15;
            this.resetBall();
        }

        // Speed limit
        const maxSpeed = 18;
        this.ball.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.ball.vx));
        this.ball.vy = Math.max(-maxSpeed, Math.min(maxSpeed, this.ball.vy));

        // Update particles
        this.particles.update();

        // Reduce screen shake
        this.screenShake *= 0.9;
    }

    resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.vx = 7 * (Math.random() > 0.5 ? 1 : -1);
        this.ball.vy = 5 * (Math.random() > 0.5 ? 1 : -1);
        this.trail = [];
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Screen shake
        ctx.save();
        if (this.screenShake > 0.5) {
            ctx.translate(
                (Math.random() - 0.5) * this.screenShake,
                (Math.random() - 0.5) * this.screenShake
            );
        }

        // Background with gradient
        const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gradient.addColorStop(0, '#0d0d15');
        gradient.addColorStop(1, '#050508');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Grid effect
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.05)';
        ctx.lineWidth = 1;
        const gridSize = 50;
        for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Center line with glow
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
        ctx.setLineDash([30, 20]);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        // Scores with glow
        ctx.font = 'bold 120px Orbitron';
        ctx.textAlign = 'center';

        // Left score
        ctx.fillStyle = 'rgba(255, 107, 107, 0.15)';
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.players[0]?.color || '#FF6B6B';
        ctx.fillText(this.paddles.left.score, w / 4, 150);

        // Right score
        ctx.fillStyle = 'rgba(78, 205, 196, 0.15)';
        ctx.shadowColor = this.players[1]?.color || '#4ECDC4';
        ctx.fillText(this.paddles.right.score, 3 * w / 4, 150);
        ctx.shadowBlur = 0;

        // Player names
        ctx.font = 'bold 18px Inter';
        ctx.fillStyle = this.players[0]?.color || '#FF6B6B';
        ctx.fillText(this.players[0]?.name || 'Player 1', w / 4, 180);
        ctx.fillStyle = this.players[1]?.color || '#4ECDC4';
        ctx.fillText(this.players[1]?.name || 'Player 2', 3 * w / 4, 180);

        // Ball trail
        this.trail.forEach((pos, i) => {
            const alpha = i / this.trail.length * 0.5;
            const size = (i / this.trail.length) * this.ballSize;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
        });

        // Paddles with glow
        // Left paddle
        const leftColor = this.players[0]?.color || '#FF6B6B';
        ctx.fillStyle = leftColor;
        ctx.shadowBlur = 30;
        ctx.shadowColor = leftColor;
        this.drawRoundedRect(ctx, 25, this.paddles.left.y, this.paddleWidth, this.paddleHeight, 8);

        // Right paddle
        const rightColor = this.players[1]?.color || '#4ECDC4';
        ctx.fillStyle = rightColor;
        ctx.shadowColor = rightColor;
        this.drawRoundedRect(ctx, w - 25 - this.paddleWidth, this.paddles.right.y, this.paddleWidth, this.paddleHeight, 8);

        // Ball with intense glow
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 40;
        ctx.shadowColor = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ballSize, 0, Math.PI * 2);
        ctx.fill();

        // Extra ball glow layers
        ctx.shadowBlur = 60;
        ctx.shadowColor = 'rgba(139, 92, 246, 0.8)';
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ballSize * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Particles
        this.particles.draw(ctx);

        ctx.restore();
    }

    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }
}

// ===================================
// ENHANCED SPACE RACING GAME
// ===================================
class RacingGame {
    constructor(canvas, players, socket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.players = players;
        this.socket = socket;
        this.running = false;

        this.particles = new ParticleSystem();
        this.stars = [];
        this.asteroids = [];

        this.init();
    }

    init() {
        // Create stars
        for (let i = 0; i < 200; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 2 + 1,
                brightness: Math.random()
            });
        }

        // Create asteroids
        for (let i = 0; i < 8; i++) {
            this.asteroids.push(this.createAsteroid());
        }

        // Create ships
        this.ships = [];
        const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#AA96DA'];
        const startX = this.canvas.width / 2;
        const spacing = 80;

        this.players.forEach((player, i) => {
            this.ships.push({
                x: startX + (i - (this.players.length - 1) / 2) * spacing,
                y: this.canvas.height - 120,
                angle: -Math.PI / 2,
                speed: 0,
                color: player.color || colors[i % colors.length],
                name: player.name,
                playerNumber: player.number,
                score: 0,
                boostCooldown: 0,
                trail: []
            });
        });

        this.inputs = {};
        this.gameTime = 0;
    }

    createAsteroid() {
        return {
            x: Math.random() * this.canvas.width,
            y: -50 - Math.random() * 200,
            size: Math.random() * 40 + 20,
            speed: Math.random() * 2 + 1,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.05,
            vertices: this.generateAsteroidShape()
        };
    }

    generateAsteroidShape() {
        const vertices = [];
        const points = Math.floor(Math.random() * 4) + 6;
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const radius = 0.7 + Math.random() * 0.3;
            vertices.push({ angle, radius });
        }
        return vertices;
    }

    start() {
        this.running = true;
        this.gameLoop();
    }

    stop() {
        this.running = false;
    }

    handleInput(input) {
        this.inputs[input.playerNumber] = input;
    }

    gameLoop() {
        if (!this.running) return;
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.gameTime++;

        // Update stars
        this.stars.forEach(star => {
            star.y += star.speed;
            if (star.y > this.canvas.height) {
                star.y = 0;
                star.x = Math.random() * this.canvas.width;
            }
        });

        // Update asteroids
        this.asteroids.forEach(asteroid => {
            asteroid.y += asteroid.speed;
            asteroid.rotation += asteroid.rotationSpeed;
            if (asteroid.y > this.canvas.height + 100) {
                Object.assign(asteroid, this.createAsteroid());
            }
        });

        // Update ships
        const maxSpeed = 8;
        const acceleration = 0.4;
        const friction = 0.97;
        const turnSpeed = 0.08;

        this.ships.forEach(ship => {
            const input = this.inputs[ship.playerNumber] || {};

            // Throttle
            if (input.up || (input.joystickY && input.joystickY < -0.3)) {
                ship.speed = Math.min(maxSpeed, ship.speed + acceleration);
                // Engine particles
                if (this.gameTime % 2 === 0) {
                    const exhaustAngle = ship.angle + Math.PI;
                    this.particles.emit(
                        ship.x + Math.cos(exhaustAngle) * 25,
                        ship.y + Math.sin(exhaustAngle) * 25,
                        ship.color,
                        2,
                        { x: Math.cos(exhaustAngle) * 3, y: Math.sin(exhaustAngle) * 3 }
                    );
                }
            }
            if (input.down || (input.joystickY && input.joystickY > 0.3)) {
                ship.speed = Math.max(-maxSpeed / 3, ship.speed - acceleration * 0.5);
            }

            // Steering
            if (input.left || (input.joystickX && input.joystickX < -0.3)) {
                ship.angle -= turnSpeed * Math.max(0.3, Math.abs(ship.speed) / maxSpeed);
            }
            if (input.right || (input.joystickX && input.joystickX > 0.3)) {
                ship.angle += turnSpeed * Math.max(0.3, Math.abs(ship.speed) / maxSpeed);
            }

            // Boost
            if (input.buttonA && ship.boostCooldown <= 0) {
                ship.speed = maxSpeed * 1.5;
                ship.boostCooldown = 60;
                this.particles.emit(ship.x, ship.y, ship.color, 20);
            }
            ship.boostCooldown = Math.max(0, ship.boostCooldown - 1);

            // Brake with B button
            if (input.buttonB) {
                ship.speed *= 0.85;
                // Brake particles
                if (this.gameTime % 3 === 0) {
                    this.particles.emit(ship.x, ship.y, '#ff4444', 3);
                }
            }

            // Apply friction
            ship.speed *= friction;

            // Move
            ship.x += Math.cos(ship.angle) * ship.speed;
            ship.y += Math.sin(ship.angle) * ship.speed;

            // Wrap around screen
            if (ship.x < -30) ship.x = this.canvas.width + 30;
            if (ship.x > this.canvas.width + 30) ship.x = -30;
            if (ship.y < -30) ship.y = this.canvas.height + 30;
            if (ship.y > this.canvas.height + 30) ship.y = -30;

            // Trail
            ship.trail.push({ x: ship.x, y: ship.y, age: 0 });
            if (ship.trail.length > 30) ship.trail.shift();
            ship.trail.forEach(t => t.age++);

            // Collision with asteroids
            this.asteroids.forEach(asteroid => {
                const dx = ship.x - asteroid.x;
                const dy = ship.y - asteroid.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < asteroid.size + 15) {
                    // Bounce off
                    ship.speed *= -0.5;
                    ship.x += dx * 0.3;
                    ship.y += dy * 0.3;
                    this.particles.emit(ship.x, ship.y, '#ff8800', 15);
                }
            });

            // Score increases as they survive
            ship.score++;
        });

        this.particles.update();
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Space background
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, '#0a0015');
        gradient.addColorStop(0.5, '#0d0d20');
        gradient.addColorStop(1, '#050510');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Stars
        this.stars.forEach(star => {
            const twinkle = Math.sin(this.gameTime * 0.1 + star.brightness * 10) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * twinkle})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Nebula effect
        ctx.fillStyle = 'rgba(139, 92, 246, 0.03)';
        ctx.beginPath();
        ctx.arc(w * 0.3, h * 0.4, 200, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(244, 114, 182, 0.03)';
        ctx.beginPath();
        ctx.arc(w * 0.7, h * 0.6, 250, 0, Math.PI * 2);
        ctx.fill();

        // Asteroids
        this.asteroids.forEach(asteroid => {
            ctx.save();
            ctx.translate(asteroid.x, asteroid.y);
            ctx.rotate(asteroid.rotation);

            ctx.fillStyle = '#2a2a3a';
            ctx.strokeStyle = '#4a4a5a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            asteroid.vertices.forEach((v, i) => {
                const x = Math.cos(v.angle) * asteroid.size * v.radius;
                const y = Math.sin(v.angle) * asteroid.size * v.radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        });

        // Ship trails
        this.ships.forEach(ship => {
            ship.trail.forEach((t, i) => {
                const alpha = (1 - t.age / 30) * 0.3;
                const size = (1 - t.age / 30) * 5;
                ctx.fillStyle = ship.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
                ctx.beginPath();
                ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
                ctx.fill();
            });
        });

        // Ships
        this.ships.forEach(ship => {
            ctx.save();
            ctx.translate(ship.x, ship.y);
            ctx.rotate(ship.angle + Math.PI / 2);

            // Glow
            ctx.shadowBlur = 30;
            ctx.shadowColor = ship.color;

            // Ship body
            ctx.fillStyle = ship.color;
            ctx.beginPath();
            ctx.moveTo(0, -25);
            ctx.lineTo(-15, 20);
            ctx.lineTo(0, 12);
            ctx.lineTo(15, 20);
            ctx.closePath();
            ctx.fill();

            // Cockpit
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(0, -5, 4, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Engine glow
            if (this.inputs[ship.playerNumber]?.up ||
                (this.inputs[ship.playerNumber]?.joystickY < -0.3)) {
                ctx.fillStyle = '#ff8800';
                ctx.shadowColor = '#ff8800';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.moveTo(-8, 20);
                ctx.lineTo(0, 35 + Math.random() * 10);
                ctx.lineTo(8, 20);
                ctx.fill();
            }

            ctx.restore();

            // Name label
            ctx.font = 'bold 12px Inter';
            ctx.fillStyle = ship.color;
            ctx.textAlign = 'center';
            ctx.fillText(ship.name, ship.x, ship.y - 40);
        });

        ctx.shadowBlur = 0;

        // Particles
        this.particles.draw(ctx);

        // Leaderboard
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.drawRoundedRect(ctx, 15, 15, 180, 40 + this.ships.length * 28, 10);

        ctx.font = 'bold 14px Orbitron';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText('🏆 LEADERBOARD', 25, 40);

        const sorted = [...this.ships].sort((a, b) => b.score - a.score);
        ctx.font = '13px Inter';
        sorted.forEach((ship, i) => {
            ctx.fillStyle = ship.color;
            ctx.fillText(`${i + 1}. ${ship.name}`, 25, 68 + i * 28);
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillText(`${Math.floor(ship.score / 10)}`, 150, 68 + i * 28);
        });

        // Controls hint
        ctx.font = '12px Inter';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.textAlign = 'center';
        ctx.fillText('🕹️ Joystick ile hareket • A butonu = Boost', w / 2, h - 20);
    }

    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }
}

// ===================================
// SNAKE BATTLE GAME
// ===================================
class SnakeGame {
    constructor(canvas, players, socket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.players = players;
        this.socket = socket;
        this.running = false;

        this.gridSize = 20;
        this.particles = new ParticleSystem();

        this.init();
    }

    init() {
        const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#AA96DA'];
        const startPositions = [
            { x: 5, y: 5, dir: { x: 1, y: 0 } },
            { x: Math.floor(this.canvas.width / this.gridSize) - 5, y: 5, dir: { x: -1, y: 0 } },
            { x: 5, y: Math.floor(this.canvas.height / this.gridSize) - 5, dir: { x: 1, y: 0 } },
            { x: Math.floor(this.canvas.width / this.gridSize) - 5, y: Math.floor(this.canvas.height / this.gridSize) - 5, dir: { x: -1, y: 0 } }
        ];

        this.snakes = this.players.map((player, i) => ({
            body: [{ ...startPositions[i % 4] }],
            direction: { ...startPositions[i % 4].dir },
            nextDirection: { ...startPositions[i % 4].dir },
            color: player.color || colors[i % colors.length],
            name: player.name,
            playerNumber: player.number,
            alive: true,
            score: 0,
            speedBoost: false
        }));

        // Initialize body length
        this.snakes.forEach(snake => {
            for (let i = 1; i < 5; i++) {
                snake.body.push({
                    x: snake.body[0].x - snake.direction.x * i,
                    y: snake.body[0].y - snake.direction.y * i
                });
            }
        });

        this.food = [];
        this.spawnFood();
        this.spawnFood();
        this.spawnFood();

        this.inputs = {};
        this.moveTimer = 0;
        this.moveInterval = 8;
    }

    spawnFood() {
        const maxX = Math.floor(this.canvas.width / this.gridSize);
        const maxY = Math.floor(this.canvas.height / this.gridSize);

        let x, y, valid;
        do {
            x = Math.floor(Math.random() * (maxX - 2)) + 1;
            y = Math.floor(Math.random() * (maxY - 2)) + 1;
            valid = true;

            this.snakes.forEach(snake => {
                snake.body.forEach(segment => {
                    if (segment.x === x && segment.y === y) valid = false;
                });
            });
        } while (!valid);

        this.food.push({
            x,
            y,
            type: Math.random() > 0.8 ? 'super' : 'normal',
            pulse: 0
        });
    }

    start() {
        this.running = true;
        this.gameLoop();
    }

    stop() {
        this.running = false;
    }

    handleInput(input) {
        const snake = this.snakes.find(s => s.playerNumber === input.playerNumber);
        if (!snake || !snake.alive) return;

        let newDir = null;

        if (input.up || input.joystickY < -0.5) newDir = { x: 0, y: -1 };
        else if (input.down || input.joystickY > 0.5) newDir = { x: 0, y: 1 };
        else if (input.left || input.joystickX < -0.5) newDir = { x: -1, y: 0 };
        else if (input.right || input.joystickX > 0.5) newDir = { x: 1, y: 0 };

        if (newDir && (newDir.x !== -snake.direction.x || newDir.y !== -snake.direction.y)) {
            snake.nextDirection = newDir;
        }

        // Speed boost with B button
        snake.speedBoost = input.buttonB;
    }

    gameLoop() {
        if (!this.running) return;
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.moveTimer++;
        this.food.forEach(f => f.pulse++);

        // Dynamic move interval based on any snake boosting
        const anyBoosting = this.snakes.some(s => s.alive && s.speedBoost);
        const currentInterval = anyBoosting ? Math.floor(this.moveInterval / 2) : this.moveInterval;

        if (this.moveTimer >= currentInterval) {
            this.moveTimer = 0;

            this.snakes.forEach(snake => {
                if (!snake.alive) return;

                snake.direction = { ...snake.nextDirection };

                const head = snake.body[0];
                const newHead = {
                    x: head.x + snake.direction.x,
                    y: head.y + snake.direction.y
                };

                // Wall collision
                const maxX = Math.floor(this.canvas.width / this.gridSize);
                const maxY = Math.floor(this.canvas.height / this.gridSize);
                if (newHead.x < 0 || newHead.x >= maxX || newHead.y < 0 || newHead.y >= maxY) {
                    snake.alive = false;
                    this.particles.emit(head.x * this.gridSize + this.gridSize / 2, head.y * this.gridSize + this.gridSize / 2, snake.color, 30);
                    return;
                }

                // Self collision
                if (snake.body.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
                    snake.alive = false;
                    this.particles.emit(head.x * this.gridSize + this.gridSize / 2, head.y * this.gridSize + this.gridSize / 2, snake.color, 30);
                    return;
                }

                // Other snake collision
                this.snakes.forEach(other => {
                    if (other === snake || !other.alive) return;
                    if (other.body.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
                        snake.alive = false;
                        this.particles.emit(head.x * this.gridSize + this.gridSize / 2, head.y * this.gridSize + this.gridSize / 2, snake.color, 30);
                    }
                });

                if (!snake.alive) return;

                snake.body.unshift(newHead);

                // Food collision
                let ate = false;
                this.food = this.food.filter(food => {
                    if (food.x === newHead.x && food.y === newHead.y) {
                        snake.score += food.type === 'super' ? 5 : 1;
                        if (food.type === 'super') {
                            snake.body.push({ ...snake.body[snake.body.length - 1] });
                            snake.body.push({ ...snake.body[snake.body.length - 1] });
                        }
                        this.particles.emit(food.x * this.gridSize + this.gridSize / 2, food.y * this.gridSize + this.gridSize / 2, food.type === 'super' ? '#FFE66D' : '#10b981', 15);
                        ate = true;
                        return false;
                    }
                    return true;
                });

                if (!ate) {
                    snake.body.pop();
                } else {
                    this.spawnFood();
                }
            });
        }

        this.particles.update();
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const gs = this.gridSize;

        // Background
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, w, h);

        // Grid
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += gs) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += gs) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Food
        this.food.forEach(food => {
            const pulse = Math.sin(food.pulse * 0.1) * 0.2 + 1;
            const size = (gs / 2 - 2) * pulse;
            const cx = food.x * gs + gs / 2;
            const cy = food.y * gs + gs / 2;

            ctx.shadowBlur = 20;
            ctx.shadowColor = food.type === 'super' ? '#FFE66D' : '#10b981';
            ctx.fillStyle = food.type === 'super' ? '#FFE66D' : '#10b981';
            ctx.beginPath();
            ctx.arc(cx, cy, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Snakes
        this.snakes.forEach(snake => {
            if (!snake.alive) return;

            ctx.shadowBlur = 15;
            ctx.shadowColor = snake.color;

            snake.body.forEach((segment, i) => {
                const size = i === 0 ? gs - 4 : gs - 6;
                const alpha = 1 - (i / snake.body.length) * 0.5;

                ctx.fillStyle = snake.color;
                ctx.globalAlpha = alpha;

                const x = segment.x * gs + (gs - size) / 2;
                const y = segment.y * gs + (gs - size) / 2;

                ctx.beginPath();
                ctx.roundRect(x, y, size, size, 4);
                ctx.fill();

                // Eyes on head
                if (i === 0) {
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowBlur = 0;
                    const eyeSize = 4;
                    const eyeOffset = 5;
                    ctx.beginPath();
                    ctx.arc(segment.x * gs + gs / 2 - eyeOffset, segment.y * gs + gs / 2 - 2, eyeSize, 0, Math.PI * 2);
                    ctx.arc(segment.x * gs + gs / 2 + eyeOffset, segment.y * gs + gs / 2 - 2, eyeSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        });

        // Particles
        this.particles.draw(ctx);

        // Scoreboard
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 160, 30 + this.snakes.length * 25);

        ctx.font = 'bold 14px Orbitron';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText('SCORE', 20, 32);

        ctx.font = '12px Inter';
        this.snakes.forEach((snake, i) => {
            ctx.fillStyle = snake.alive ? snake.color : 'rgba(255,255,255,0.3)';
            ctx.fillText(`${snake.alive ? '🐍' : '💀'} ${snake.name}: ${snake.score}`, 20, 55 + i * 25);
        });
    }
}

// ===================================
// REACTION GAME
// ===================================
class ReactionGame {
    constructor(canvas, players, socket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.players = players;
        this.socket = socket;
        this.running = false;

        this.particles = new ParticleSystem();
        this.init();
    }

    init() {
        const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#AA96DA', '#F38181', '#95E1D3', '#FCBAD3', '#A8D8EA'];

        this.playerData = this.players.map((player, i) => ({
            name: player.name,
            playerNumber: player.number,
            color: player.color || colors[i % colors.length],
            score: 0,
            reacted: false,
            reactionTime: 0
        }));

        this.round = 0;
        this.maxRounds = 5;
        this.phase = 'waiting'; // waiting, ready, go, result
        this.timer = 0;
        this.goTime = 0;
        this.winner = null;

        this.inputs = {};

        this.startRound();
    }

    startRound() {
        this.round++;
        this.phase = 'waiting';
        this.timer = 60 + Math.random() * 120; // 1-3 seconds random wait
        this.playerData.forEach(p => {
            p.reacted = false;
            p.reactionTime = 0;
        });
        this.winner = null;
    }

    start() {
        this.running = true;
        this.gameLoop();
    }

    stop() {
        this.running = false;
    }

    handleInput(input) {
        if (input.buttonA || input.buttonB) {
            const player = this.playerData.find(p => p.playerNumber === input.playerNumber);
            if (!player || player.reacted) return;

            if (this.phase === 'go') {
                player.reacted = true;
                player.reactionTime = Date.now() - this.goTime;

                if (!this.winner) {
                    this.winner = player;
                    player.score += 10;
                    this.particles.emit(this.canvas.width / 2, this.canvas.height / 2, player.color, 50);
                }
            } else if (this.phase === 'waiting') {
                // Too early!
                player.reacted = true;
                player.reactionTime = -1;
                player.score -= 5;
                this.particles.emit(this.canvas.width / 2, this.canvas.height / 2, '#ef4444', 30);
            }
        }
    }

    gameLoop() {
        if (!this.running) return;
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.particles.update();

        if (this.phase === 'waiting') {
            this.timer--;
            if (this.timer <= 0) {
                this.phase = 'go';
                this.goTime = Date.now();
                this.timer = 180; // 3 seconds to react
            }
        } else if (this.phase === 'go') {
            this.timer--;
            if (this.timer <= 0 || this.playerData.every(p => p.reacted)) {
                this.phase = 'result';
                this.timer = 120; // 2 seconds to show result
            }
        } else if (this.phase === 'result') {
            this.timer--;
            if (this.timer <= 0) {
                if (this.round < this.maxRounds) {
                    this.startRound();
                } else {
                    this.phase = 'gameover';
                }
            }
        }
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Background
        let bgColor = '#1a1a2e';
        if (this.phase === 'waiting') bgColor = '#2d1f3d';
        if (this.phase === 'go') bgColor = '#1a3d1a';

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);

        // Round indicator
        ctx.font = 'bold 20px Orbitron';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'center';
        ctx.fillText(`Round ${this.round}/${this.maxRounds}`, w / 2, 40);

        // Main content
        ctx.textAlign = 'center';

        if (this.phase === 'waiting') {
            ctx.font = 'bold 60px Orbitron';
            ctx.fillStyle = '#ef4444';
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#ef4444';
            ctx.fillText('BEKLE...', w / 2, h / 2);

            ctx.font = '24px Inter';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.shadowBlur = 0;
            ctx.fillText('Yeşil olunca basın!', w / 2, h / 2 + 50);
        } else if (this.phase === 'go') {
            ctx.font = 'bold 80px Orbitron';
            ctx.fillStyle = '#10b981';
            ctx.shadowBlur = 50;
            ctx.shadowColor = '#10b981';
            ctx.fillText('BAS!', w / 2, h / 2);
            ctx.shadowBlur = 0;
        } else if (this.phase === 'result' || this.phase === 'gameover') {
            if (this.winner) {
                ctx.font = 'bold 40px Orbitron';
                ctx.fillStyle = this.winner.color;
                ctx.shadowBlur = 30;
                ctx.shadowColor = this.winner.color;
                ctx.fillText(`🏆 ${this.winner.name}`, w / 2, h / 2 - 30);

                ctx.font = '24px Inter';
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 0;
                ctx.fillText(`${this.winner.reactionTime}ms`, w / 2, h / 2 + 20);
            } else {
                ctx.font = 'bold 40px Orbitron';
                ctx.fillStyle = '#888';
                ctx.fillText('Kimse basmadı!', w / 2, h / 2);
            }
        }

        // Player scores
        const playerWidth = Math.min(150, (w - 40) / this.playerData.length);
        this.playerData.forEach((player, i) => {
            const x = 20 + i * playerWidth + playerWidth / 2;
            const y = h - 100;

            // Background
            ctx.fillStyle = player.reacted ?
                (player.reactionTime < 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)') :
                'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.roundRect(x - playerWidth / 2 + 5, y - 30, playerWidth - 10, 80, 10);
            ctx.fill();

            // Name
            ctx.font = 'bold 14px Inter';
            ctx.fillStyle = player.color;
            ctx.textAlign = 'center';
            ctx.fillText(player.name, x, y);

            // Score
            ctx.font = 'bold 24px Orbitron';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(player.score, x, y + 35);
        });

        // Particles
        this.particles.draw(ctx);

        // Game over
        if (this.phase === 'gameover') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, w, h);

            const winner = [...this.playerData].sort((a, b) => b.score - a.score)[0];

            ctx.font = 'bold 50px Orbitron';
            ctx.fillStyle = winner.color;
            ctx.shadowBlur = 40;
            ctx.shadowColor = winner.color;
            ctx.textAlign = 'center';
            ctx.fillText('🏆 KAZANAN 🏆', w / 2, h / 2 - 40);
            ctx.fillText(winner.name, w / 2, h / 2 + 30);

            ctx.font = '24px Inter';
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 0;
            ctx.fillText(`${winner.score} puan`, w / 2, h / 2 + 80);
        }
    }
}

// ===================================
// REFLEX MASTER GAME
// ===================================
class ReflexGame {
    constructor(canvas, players, socket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.players = players;
        this.socket = socket;
        this.running = false;

        this.particles = new ParticleSystem();
        this.init();
    }

    init() {
        const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#AA96DA'];

        this.playerData = this.players.map((player, i) => ({
            name: player.name,
            playerNumber: player.number,
            color: player.color || colors[i % colors.length],
            score: 0,
            combo: 0,
            lastHit: false
        }));

        this.targets = [];
        this.gameTime = 0;
        this.spawnRate = 90; // frames between spawns
        this.minSpawnRate = 20;
        this.targetSpeed = 2;
        this.maxTargetSpeed = 8;
        this.level = 1;
        this.inputs = {};
        this.cursors = {};

        // Initialize cursors for each player
        this.playerData.forEach((p, i) => {
            this.cursors[p.playerNumber] = {
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                color: p.color
            };
        });
    }

    spawnTarget() {
        const types = ['normal', 'bonus', 'danger'];
        const type = Math.random() > 0.85 ? (Math.random() > 0.5 ? 'bonus' : 'danger') : 'normal';

        this.targets.push({
            x: 50 + Math.random() * (this.canvas.width - 100),
            y: 50 + Math.random() * (this.canvas.height - 200),
            size: type === 'bonus' ? 25 : (type === 'danger' ? 35 : 30),
            type: type,
            life: type === 'bonus' ? 60 : 120, // frames until disappear
            maxLife: type === 'bonus' ? 60 : 120,
            pulse: 0,
            points: type === 'bonus' ? 50 : (type === 'danger' ? -30 : 10)
        });
    }

    start() {
        this.running = true;
        this.gameLoop();
    }

    stop() {
        this.running = false;
    }

    handleInput(input) {
        const cursor = this.cursors[input.playerNumber];
        if (!cursor) return;

        // Move cursor with joystick
        const speed = 15;
        if (input.joystickX !== undefined) {
            cursor.x += input.joystickX * speed;
        }
        if (input.joystickY !== undefined) {
            cursor.y += input.joystickY * speed;
        }

        // Keep in bounds
        cursor.x = Math.max(20, Math.min(this.canvas.width - 20, cursor.x));
        cursor.y = Math.max(20, Math.min(this.canvas.height - 20, cursor.y));

        // Check for hit on button press
        if (input.buttonA || input.buttonB) {
            this.checkHit(input.playerNumber, cursor.x, cursor.y);
        }

        this.inputs[input.playerNumber] = input;
    }

    checkHit(playerNumber, x, y) {
        const player = this.playerData.find(p => p.playerNumber === playerNumber);
        if (!player) return;

        let hit = false;
        this.targets = this.targets.filter(target => {
            const dx = x - target.x;
            const dy = y - target.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < target.size + 15) {
                hit = true;
                player.score += target.points * (1 + player.combo * 0.1);

                if (target.type === 'danger') {
                    player.combo = 0;
                    this.particles.emit(target.x, target.y, '#ef4444', 20);
                } else {
                    player.combo++;
                    this.particles.emit(target.x, target.y, target.type === 'bonus' ? '#FFE66D' : '#10b981', 15);
                }

                return false;
            }
            return true;
        });

        if (!hit) {
            player.score = Math.max(0, player.score - 5);
            player.combo = 0;
        }

        player.lastHit = hit;
    }

    gameLoop() {
        if (!this.running) return;
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.gameTime++;

        // Increase difficulty
        if (this.gameTime % 600 === 0) {
            this.level++;
            this.spawnRate = Math.max(this.minSpawnRate, this.spawnRate - 10);
            this.targetSpeed = Math.min(this.maxTargetSpeed, this.targetSpeed + 0.5);
        }

        // Spawn targets
        if (this.gameTime % this.spawnRate === 0) {
            this.spawnTarget();
        }

        // Update targets
        this.targets = this.targets.filter(target => {
            target.life--;
            target.pulse++;
            return target.life > 0;
        });

        this.particles.update();
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Background
        const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#0f0f1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Grid
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Level indicator
        ctx.font = 'bold 20px Orbitron';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.textAlign = 'center';
        ctx.fillText(`LEVEL ${this.level}`, w / 2, 40);

        // Targets
        this.targets.forEach(target => {
            const lifeRatio = target.life / target.maxLife;
            const pulse = Math.sin(target.pulse * 0.2) * 0.1 + 1;
            const size = target.size * pulse * lifeRatio;

            ctx.shadowBlur = 20;

            if (target.type === 'normal') {
                ctx.fillStyle = '#10b981';
                ctx.shadowColor = '#10b981';
            } else if (target.type === 'bonus') {
                ctx.fillStyle = '#FFE66D';
                ctx.shadowColor = '#FFE66D';
            } else {
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = '#ef4444';
            }

            // Outer ring
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(target.x, target.y, size + 10, 0, Math.PI * 2 * lifeRatio);
            ctx.stroke();

            // Inner circle
            ctx.beginPath();
            ctx.arc(target.x, target.y, size, 0, Math.PI * 2);
            ctx.fill();

            // Center dot
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(target.x, target.y, 5, 0, Math.PI * 2);
            ctx.fill();

            // Points label
            ctx.font = 'bold 14px Orbitron';
            ctx.fillStyle = target.type === 'danger' ? '#ef4444' : '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(target.type === 'danger' ? '☠️' : (target.type === 'bonus' ? '⭐' : `+${target.points}`), target.x, target.y - size - 15);
        });

        ctx.shadowBlur = 0;

        // Cursors
        Object.entries(this.cursors).forEach(([playerNum, cursor]) => {
            ctx.strokeStyle = cursor.color;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = cursor.color;

            // Crosshair
            const size = 20;
            ctx.beginPath();
            ctx.moveTo(cursor.x - size, cursor.y);
            ctx.lineTo(cursor.x - 8, cursor.y);
            ctx.moveTo(cursor.x + 8, cursor.y);
            ctx.lineTo(cursor.x + size, cursor.y);
            ctx.moveTo(cursor.x, cursor.y - size);
            ctx.lineTo(cursor.x, cursor.y - 8);
            ctx.moveTo(cursor.x, cursor.y + 8);
            ctx.lineTo(cursor.x, cursor.y + size);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cursor.x, cursor.y, 12, 0, Math.PI * 2);
            ctx.stroke();
        });

        ctx.shadowBlur = 0;

        // Particles
        this.particles.draw(ctx);

        // Scoreboard
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 200, 30 + this.playerData.length * 35);

        ctx.font = 'bold 14px Orbitron';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText('🎯 SCORE', 20, 35);

        ctx.font = '12px Inter';
        this.playerData.forEach((player, i) => {
            ctx.fillStyle = player.color;
            ctx.fillText(`${player.name}`, 20, 60 + i * 35);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`${Math.floor(player.score)}`, 20, 75 + i * 35);
            if (player.combo > 1) {
                ctx.fillStyle = '#FFE66D';
                ctx.fillText(`x${player.combo}`, 100, 75 + i * 35);
            }
        });
    }
}

// ===================================
// CAR DODGE GAME
// ===================================
class CarDodgeGame {
    constructor(canvas, players, socket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.players = players;
        this.socket = socket;
        this.running = false;

        this.particles = new ParticleSystem();
        this.init();
    }

    init() {
        const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#AA96DA'];

        // Split screen mode - each player gets half the screen
        this.splitScreen = this.players.length >= 2;
        this.viewportHeight = this.splitScreen ? this.canvas.height / 2 : this.canvas.height;

        this.cars = this.players.map((player, i) => {
            const viewportY = this.splitScreen ? (i * this.viewportHeight) : 0;
            const laneWidth = this.canvas.width / 5;

            return {
                x: this.canvas.width / 2,
                y: viewportY + this.viewportHeight - 100,
                targetX: this.canvas.width / 2,
                viewportIndex: i,
                viewportY: viewportY,
                width: 45,
                height: 75,
                color: player.color || colors[i % colors.length],
                name: player.name,
                playerNumber: player.number,
                score: 0,
                lives: 3,
                alive: true,
                invincible: 0,
                // Power-ups
                shield: 0,
                magnet: 0,
                nitro: 0,
                nitroFuel: 100,
                // Combo
                combo: 0,
                comboTimer: 0,
                // Visual
                tilt: 0,
                engineFlame: 0,
                // Per-player obstacles and coins
                obstacles: [],
                coins: [],
                powerUps: []
            };
        });

        this.roadLines = [];
        this.skidMarks = [];

        // Create road lines for each viewport
        for (let y = 0; y < this.viewportHeight; y += 80) {
            this.roadLines.push({ y: y });
        }

        this.gameTime = 0;
        this.speed = 3.5;
        this.maxSpeed = 10;
        this.baseSpawnRate = 70;
        this.spawnRate = this.baseSpawnRate;
        this.level = 1;
        this.distance = 0;
        this.inputs = {};
        this.screenShake = 0;
        this.gameOver = false;
    }

    spawnObstacle(car) {
        const laneWidth = this.canvas.width / 5;
        const lane = Math.floor(Math.random() * 5) + 1;

        const types = ['car', 'car', 'car', 'truck', 'police', 'barrier'];
        const type = types[Math.floor(Math.random() * types.length)];

        const laneCenter = (lane - 0.5) * laneWidth;

        let obstacle = {
            x: laneCenter,
            y: -100,
            width: 50,
            height: 80,
            type: type,
            lane: lane
        };

        obstacle.x = Math.max(laneWidth * 0.6, Math.min(this.canvas.width - laneWidth * 0.6, obstacle.x));

        if (type === 'truck') {
            obstacle.width = 55;
            obstacle.height = 120;
            obstacle.color = ['#8B4513', '#4a4a4a', '#2d5a27'][Math.floor(Math.random() * 3)];
        } else if (type === 'police') {
            obstacle.color = '#1a1a2e';
            obstacle.sirenPhase = 0;
        } else if (type === 'barrier') {
            obstacle.width = 80;
            obstacle.height = 30;
            obstacle.color = '#ff6600';
        } else {
            obstacle.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        }

        car.obstacles.push(obstacle);
    }

    spawnCoin(car) {
        const laneWidth = this.canvas.width / 5;
        const lane = Math.floor(Math.random() * 5) + 1;
        const laneCenter = (lane - 0.5) * laneWidth;

        const count = Math.random() > 0.7 ? 5 : 1;
        for (let i = 0; i < count; i++) {
            car.coins.push({
                x: laneCenter,
                y: -30 - i * 40,
                size: 12,
                rotation: 0,
                value: 10,
                glow: 0
            });
        }
    }

    spawnPowerUp(car) {
        const laneWidth = this.canvas.width / 5;
        const lane = Math.floor(Math.random() * 5) + 1;
        const laneCenter = (lane - 0.5) * laneWidth;

        const types = ['shield', 'magnet', 'nitro', 'life'];
        const type = types[Math.floor(Math.random() * types.length)];

        car.powerUps.push({
            x: laneCenter,
            y: -40,
            size: 25,
            type: type,
            rotation: 0,
            pulse: 0
        });
    }

    start() {
        this.running = true;
        this.gameLoop();
    }

    stop() {
        this.running = false;
    }

    handleInput(input) {
        const car = this.cars.find(c => c.playerNumber === input.playerNumber);
        if (!car || !car.alive) return;

        const laneWidth = this.canvas.width / 5;
        const moveSpeed = car.nitro > 0 ? 12 : 10;

        // Smooth movement
        if (input.joystickX !== undefined) {
            car.targetX += input.joystickX * moveSpeed;
            car.tilt = input.joystickX * 0.2;
        } else {
            if (input.left) {
                car.targetX -= moveSpeed;
                car.tilt = -0.2;
            }
            if (input.right) {
                car.targetX += moveSpeed;
                car.tilt = 0.2;
            }
        }

        // Keep in bounds
        car.targetX = Math.max(laneWidth * 0.6, Math.min(this.canvas.width - laneWidth * 0.6, car.targetX));

        // Activate nitro - ONLY when bar is FULL (100)
        if (input.buttonA && car.nitroFuel >= 100 && car.nitro <= 0) {
            car.nitro = 180;
            car.nitroFuel = 0; // Use all fuel
        }

        // Emergency shield with B button (60 second cooldown)
        if (input.buttonB && !car.buttonBPressed && car.shield <= 0 && (car.shieldCooldown || 0) <= 0) {
            car.shield = 180; // 3 seconds protection
            car.shieldCooldown = 3600; // 60 second cooldown
            this.particles.emit(car.x, this.viewportHeight - 100 + car.viewportY, '#4ECDC4', 25);
        }
        car.buttonBPressed = input.buttonB;
        if (car.shieldCooldown > 0) car.shieldCooldown--;

        this.inputs[input.playerNumber] = input;
    }

    gameLoop() {
        if (!this.running) return;
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.gameTime++;
        this.distance += this.speed;

        // Level up every 3000 distance - only affects spawn rate, NOT speed
        const newLevel = Math.floor(this.distance / 3000) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            // Speed stays CONSTANT at 3.5 - no increase
            this.spawnRate = Math.max(40, this.baseSpawnRate - this.level * 3);
        }

        // Update road lines
        this.roadLines.forEach(line => {
            line.y += this.speed;
            if (line.y > this.viewportHeight) {
                line.y = -20;
            }
        });

        // Update skid marks
        this.skidMarks = this.skidMarks.filter(mark => {
            mark.alpha -= 0.005;
            return mark.alpha > 0;
        });

        // Update each player
        this.cars.forEach(car => {
            if (!car.alive) return;

            // Spawn objects for this player
            if (this.gameTime % this.spawnRate === 0) {
                this.spawnObstacle(car);
            }
            if (this.gameTime % 70 === 0) {
                this.spawnCoin(car);
            }
            if (this.gameTime % 300 === 0) {
                this.spawnPowerUp(car);
            }

            // Update this player's obstacles
            car.obstacles = car.obstacles.filter(obs => {
                obs.y += this.speed * (obs.type === 'truck' ? 0.8 : 1);
                if (obs.type === 'police') {
                    obs.sirenPhase += 0.3;
                }
                return obs.y < this.viewportHeight + 150;
            });

            // Update this player's coins
            car.coins = car.coins.filter(coin => {
                coin.y += this.speed;
                coin.rotation += 0.15;
                coin.glow = Math.sin(this.gameTime * 0.1) * 0.3 + 0.7;
                return coin.y < this.viewportHeight + 50;
            });

            // Update this player's power-ups
            car.powerUps = car.powerUps.filter(pu => {
                pu.y += this.speed * 0.9;
                pu.rotation += 0.05;
                pu.pulse = Math.sin(this.gameTime * 0.1) * 0.2 + 1;
                return pu.y < this.viewportHeight + 50;
            });

            // Smooth position
            car.x += (car.targetX - car.x) * 0.15;
            car.tilt *= 0.9;

            // Timers
            car.invincible = Math.max(0, car.invincible - 1);
            car.shield = Math.max(0, car.shield - 1);
            car.magnet = Math.max(0, car.magnet - 1);
            car.nitro = Math.max(0, car.nitro - 1);
            car.comboTimer = Math.max(0, car.comboTimer - 1);

            if (car.comboTimer <= 0) {
                car.combo = 0;
            }

            // Nitro fuel regeneration
            if (car.nitro <= 0) {
                car.nitroFuel = Math.min(100, car.nitroFuel + 0.1);
            }

            // Nitro effects
            if (car.nitro > 0) {
                car.engineFlame = Math.random() * 20 + 30;
                car.score += 2;
            } else {
                car.engineFlame *= 0.9;
            }

            // Score
            car.score++;

            // Magnet effect - attract coins
            if (car.magnet > 0) {
                car.coins.forEach(coin => {
                    const localCarY = this.viewportHeight - 100;
                    const dx = car.x - coin.x;
                    const dy = localCarY - coin.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 200) {
                        coin.x += dx * 0.1;
                        coin.y += dy * 0.1;
                    }
                });
            }

            // Check coin collision (using local viewport Y)
            const localCarY = this.viewportHeight - 100;
            car.coins = car.coins.filter(coin => {
                const dx = car.x - coin.x;
                const dy = localCarY - coin.y;
                if (Math.sqrt(dx * dx + dy * dy) < 45) {
                    car.combo++;
                    car.comboTimer = 60;
                    const bonus = coin.value * (1 + car.combo * 0.2);
                    car.score += Math.floor(bonus);
                    this.particles.emit(coin.x, coin.y + car.viewportY, '#FFE66D', 8);
                    return false;
                }
                return true;
            });

            // Check power-up collision
            car.powerUps = car.powerUps.filter(pu => {
                const dx = car.x - pu.x;
                const dy = localCarY - pu.y;
                if (Math.sqrt(dx * dx + dy * dy) < 50) {
                    if (pu.type === 'shield') {
                        car.shield = 300;
                        this.particles.emit(pu.x, pu.y + car.viewportY, '#4ECDC4', 20);
                    } else if (pu.type === 'magnet') {
                        car.magnet = 600;
                        this.particles.emit(pu.x, pu.y + car.viewportY, '#AA96DA', 20);
                    } else if (pu.type === 'nitro') {
                        car.nitroFuel = 100;
                        this.particles.emit(pu.x, pu.y + car.viewportY, '#ff8800', 20);
                    } else if (pu.type === 'life') {
                        car.lives = Math.min(5, car.lives + 1);
                        this.particles.emit(pu.x, pu.y + car.viewportY, '#FF6B6B', 20);
                    }
                    return false;
                }
                return true;
            });

            // Check obstacle collision
            if (car.invincible <= 0 && car.shield <= 0) {
                car.obstacles.forEach(obs => {
                    const dx = Math.abs(car.x - obs.x);
                    const dy = Math.abs(localCarY - obs.y);
                    const hitWidth = (car.width + obs.width) / 2 - 5;
                    const hitHeight = (car.height + obs.height) / 2 - 5;

                    if (dx < hitWidth && dy < hitHeight) {
                        car.lives--;
                        car.invincible = 120;
                        this.screenShake = 15;
                        car.combo = 0;

                        // Add skid marks
                        this.skidMarks.push({
                            x: car.x - 10,
                            y: car.y,
                            viewportY: car.viewportY,
                            length: 80,
                            alpha: 0.5
                        });
                        this.skidMarks.push({
                            x: car.x + 10,
                            y: car.y,
                            viewportY: car.viewportY,
                            length: 80,
                            alpha: 0.5
                        });

                        this.particles.emit(car.x, car.y, '#ff4444', 25);

                        if (car.lives <= 0) {
                            car.alive = false;
                            this.particles.emit(car.x, car.y, car.color, 50);
                        }
                    }
                });
            }
        });

        // Screen shake decay
        this.screenShake *= 0.9;

        this.particles.update();

        // Check for game over - stop when all players dead
        const aliveCount = this.cars.filter(c => c.alive).length;
        if (aliveCount === 0 && !this.gameOver) {
            this.gameOver = true;
            setTimeout(() => {
                this.running = false;
            }, 3000);
        }
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear screen
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(0, 0, w, h);

        // Screen shake
        ctx.save();
        if (this.screenShake > 0.5) {
            ctx.translate(
                (Math.random() - 0.5) * this.screenShake,
                (Math.random() - 0.5) * this.screenShake
            );
        }

        // Render each player's viewport
        this.cars.forEach((car, playerIndex) => {
            ctx.save();

            // Set up clipping region for this player's viewport
            const viewportY = this.splitScreen ? playerIndex * this.viewportHeight : 0;
            const viewportH = this.viewportHeight;

            ctx.beginPath();
            ctx.rect(0, viewportY, w, viewportH);
            ctx.clip();
            ctx.translate(0, viewportY);

            // Background
            ctx.fillStyle = '#2a2a3a';
            ctx.fillRect(0, 0, w, viewportH);

            // Road
            const laneWidth = w / 5;
            ctx.fillStyle = '#2d2d3d';
            ctx.fillRect(laneWidth * 0.3, 0, w - laneWidth * 0.6, viewportH);

            // Road edges
            ctx.fillStyle = '#2d5a27';
            ctx.fillRect(0, 0, laneWidth * 0.4, viewportH);
            ctx.fillRect(w - laneWidth * 0.4, 0, laneWidth * 0.4, viewportH);

            // Lane lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 3;
            ctx.setLineDash([30, 50]);
            this.roadLines.forEach(line => {
                for (let lane = 1; lane < 5; lane++) {
                    ctx.beginPath();
                    ctx.moveTo(lane * laneWidth, line.y);
                    ctx.lineTo(lane * laneWidth, line.y + 40);
                    ctx.stroke();
                }
            });
            ctx.setLineDash([]);

            // This player's coins
            car.coins.forEach(coin => {
                ctx.save();
                ctx.translate(coin.x, coin.y);
                ctx.rotate(coin.rotation);

                const scale = Math.abs(Math.cos(coin.rotation * 2));
                ctx.scale(scale > 0.1 ? scale : 0.1, 1);

                ctx.fillStyle = '#FFE66D';
                ctx.shadowBlur = 15 * coin.glow;
                ctx.shadowColor = '#FFE66D';
                ctx.beginPath();
                ctx.arc(0, 0, coin.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                ctx.restore();
            });

            // This player's power-ups
            car.powerUps.forEach(pu => {
                ctx.save();
                ctx.translate(pu.x, pu.y);
                ctx.rotate(pu.rotation);
                ctx.scale(pu.pulse, pu.pulse);

                const puColors = { shield: '#4ECDC4', magnet: '#AA96DA', nitro: '#ff8800', life: '#FF6B6B' };
                ctx.fillStyle = puColors[pu.type] || '#ffffff';
                ctx.shadowBlur = 20;
                ctx.shadowColor = puColors[pu.type];
                ctx.beginPath();
                ctx.arc(0, 0, pu.size, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 0;
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                const icons = { shield: '🛡️', magnet: '🧲', nitro: '🔥', life: '❤️' };
                ctx.fillText(icons[pu.type] || '?', 0, 6);

                ctx.restore();
            });

            // This player's obstacles
            car.obstacles.forEach(obs => {
                ctx.save();
                ctx.translate(obs.x, obs.y);

                if (obs.type === 'barrier') {
                    ctx.fillStyle = '#ff6600';
                    ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
                    ctx.fillStyle = '#ffffff';
                    for (let i = 0; i < 4; i++) {
                        ctx.fillRect(-obs.width / 2 + i * 25, -obs.height / 2, 15, obs.height);
                    }
                } else if (obs.type === 'truck') {
                    ctx.fillStyle = obs.color;
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.beginPath();
                    ctx.roundRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height, 5);
                    ctx.fill();
                    ctx.fillStyle = '#333';
                    ctx.shadowBlur = 0;
                    ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, 25);
                } else if (obs.type === 'police') {
                    ctx.fillStyle = obs.color;
                    ctx.shadowBlur = 8;
                    ctx.beginPath();
                    ctx.roundRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height, 8);
                    ctx.fill();
                    const sirenColor1 = Math.sin(obs.sirenPhase) > 0 ? '#ff0000' : '#440000';
                    const sirenColor2 = Math.sin(obs.sirenPhase) < 0 ? '#0000ff' : '#000044';
                    ctx.fillStyle = sirenColor1;
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = sirenColor1;
                    ctx.beginPath();
                    ctx.arc(-10, -obs.height / 2 + 10, 5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = sirenColor2;
                    ctx.shadowColor = sirenColor2;
                    ctx.beginPath();
                    ctx.arc(10, -obs.height / 2 + 10, 5, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillStyle = obs.color;
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = 'rgba(0,0,0,0.4)';
                    ctx.beginPath();
                    ctx.roundRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height, 8);
                    ctx.fill();
                    ctx.fillStyle = '#1a1a2e';
                    ctx.shadowBlur = 0;
                    ctx.fillRect(-obs.width / 2 + 5, -obs.height / 2 + 12, obs.width - 10, 18);
                    ctx.fillStyle = '#ffff88';
                    ctx.beginPath();
                    ctx.arc(-obs.width / 2 + 8, -obs.height / 2 + 5, 4, 0, Math.PI * 2);
                    ctx.arc(obs.width / 2 - 8, -obs.height / 2 + 5, 4, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.shadowBlur = 0;
                ctx.restore();
            });

            // Player's car (fixed position in viewport)
            if (car.alive) {
                const carY = viewportH - 100;

                ctx.save();
                ctx.translate(car.x, carY);
                ctx.rotate(car.tilt);

                // Invincibility blink
                if (car.invincible > 0 && Math.floor(this.gameTime / 5) % 2 === 0) {
                    ctx.globalAlpha = 0.5;
                }

                // Shield effect
                if (car.shield > 0) {
                    ctx.strokeStyle = '#4ECDC4';
                    ctx.lineWidth = 3;
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = '#4ECDC4';
                    ctx.beginPath();
                    ctx.arc(0, 0, 50, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }

                // Engine flame
                if (car.engineFlame > 5) {
                    ctx.fillStyle = '#ff8800';
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = '#ff4400';
                    ctx.beginPath();
                    ctx.moveTo(-10, car.height / 2);
                    ctx.lineTo(0, car.height / 2 + car.engineFlame);
                    ctx.lineTo(10, car.height / 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }

                // Car body
                ctx.fillStyle = car.color;
                ctx.shadowBlur = 15;
                ctx.shadowColor = car.color;
                ctx.beginPath();
                ctx.roundRect(-car.width / 2, -car.height / 2, car.width, car.height, 10);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Windshield
                ctx.fillStyle = '#1a1a2e';
                ctx.fillRect(-car.width / 2 + 5, -car.height / 2 + 10, car.width - 10, 20);

                // Headlights
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ffffff';
                ctx.beginPath();
                ctx.arc(-car.width / 2 + 8, -car.height / 2 + 5, 5, 0, Math.PI * 2);
                ctx.arc(car.width / 2 - 8, -car.height / 2 + 5, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                ctx.restore();

                // Lives indicator
                ctx.font = '14px Arial';
                ctx.fillStyle = '#FF6B6B';
                for (let l = 0; l < car.lives; l++) {
                    ctx.fillText('❤️', 10 + l * 18, carY);
                }

                // Score and name
                ctx.font = 'bold 14px Orbitron';
                ctx.fillStyle = car.color;
                ctx.textAlign = 'left';
                ctx.fillText(car.name, 10, 25);
                ctx.fillText(`${car.score}`, 10, 45);
            }

            // Dead indicator
            if (!car.alive) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(0, 0, w, viewportH);
                ctx.font = 'bold 30px Orbitron';
                ctx.fillStyle = '#ef4444';
                ctx.textAlign = 'center';
                ctx.fillText('GAME OVER', w / 2, viewportH / 2);
                ctx.font = '18px Inter';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`Final Score: ${car.score}`, w / 2, viewportH / 2 + 35);
            }

            ctx.restore();
        });

        // Split screen divider line
        if (this.splitScreen) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();

            // Player labels
            ctx.font = 'bold 14px Orbitron';
            ctx.textAlign = 'right';
            this.cars.forEach((car, i) => {
                ctx.fillStyle = car.color;
                const labelY = i * this.viewportHeight + 25;
                ctx.fillText(`P${i + 1}`, w - 10, labelY);
            });
        }

        // Global UI - Level and Speed
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.roundRect(w / 2 - 70, 5, 140, 35, 8);
        ctx.fill();

        ctx.font = 'bold 12px Orbitron';
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'center';
        ctx.fillText(`LVL ${this.level} • ${Math.floor(this.speed * 18)} km/h`, w / 2, 28);

        // Particles
        this.particles.draw(ctx);
        ctx.restore();

        // All dead game over
        const aliveCount = this.cars.filter(c => c.alive).length;
        if (aliveCount === 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, 0, w, h);

            const winner = [...this.cars].sort((a, b) => b.score - a.score)[0];

            ctx.font = 'bold 50px Orbitron';
            ctx.fillStyle = '#ef4444';
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#ef4444';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', w / 2, h / 2 - 60);

            ctx.font = 'bold 35px Orbitron';
            ctx.fillStyle = winner.color;
            ctx.shadowColor = winner.color;
            ctx.fillText(`🏆 ${winner.name}`, w / 2, h / 2 + 10);

            ctx.font = '24px Inter';
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 0;
            ctx.fillText(`${winner.score} puan`, w / 2, h / 2 + 60);
        }
    }
}


// ===================================
// SPEED PUZZLE GAME
// ===================================
class PuzzleGame {
    constructor(canvas, players, socket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.players = players;
        this.socket = socket;
        this.running = false;

        this.particles = new ParticleSystem();
        this.init();
    }

    init() {
        const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#AA96DA'];

        this.playerData = this.players.map((player, i) => ({
            name: player.name,
            playerNumber: player.number,
            color: player.color || colors[i % colors.length],
            score: 0,
            answered: false,
            correct: false
        }));

        this.level = 1;
        this.round = 0;
        this.maxRounds = 10;
        this.phase = 'showing'; // showing, answering, result
        this.timer = 0;
        this.timeLimit = 180; // 3 seconds initially

        this.puzzle = null;
        this.options = [];
        this.correctAnswer = 0;
        this.inputs = {};

        this.generatePuzzle();
    }

    generatePuzzle() {
        this.round++;
        this.phase = 'showing';
        this.timer = 60; // 1 second to show
        this.playerData.forEach(p => {
            p.answered = false;
            p.correct = false;
        });

        // Different puzzle types
        const puzzleTypes = ['math', 'sequence', 'color', 'shape'];
        const type = puzzleTypes[Math.floor(Math.random() * puzzleTypes.length)];

        // Increase difficulty with level
        const difficulty = Math.min(5, Math.floor(this.level / 2) + 1);

        if (type === 'math') {
            const a = Math.floor(Math.random() * (10 * difficulty)) + 1;
            const b = Math.floor(Math.random() * (10 * difficulty)) + 1;
            const ops = ['+', '-', '×'];
            const op = ops[Math.floor(Math.random() * (difficulty > 2 ? 3 : 2))];

            let answer;
            if (op === '+') answer = a + b;
            else if (op === '-') answer = Math.max(a, b) - Math.min(a, b);
            else answer = a * b;

            this.puzzle = {
                type: 'math',
                question: op === '-' ? `${Math.max(a, b)} ${op} ${Math.min(a, b)} = ?` : `${a} ${op} ${b} = ?`
            };

            this.correctAnswer = Math.floor(Math.random() * 4);
            this.options = [];
            for (let i = 0; i < 4; i++) {
                if (i === this.correctAnswer) {
                    this.options.push(answer);
                } else {
                    let wrong = answer + (Math.floor(Math.random() * 10) - 5);
                    while (wrong === answer || this.options.includes(wrong)) {
                        wrong = answer + (Math.floor(Math.random() * 20) - 10);
                    }
                    this.options.push(wrong);
                }
            }
        } else if (type === 'sequence') {
            const start = Math.floor(Math.random() * 10);
            const step = Math.floor(Math.random() * 5) + 1;
            const sequence = [start, start + step, start + step * 2];
            const answer = start + step * 3;

            this.puzzle = {
                type: 'sequence',
                question: `${sequence.join(', ')}, ?`
            };

            this.correctAnswer = Math.floor(Math.random() * 4);
            this.options = [];
            for (let i = 0; i < 4; i++) {
                if (i === this.correctAnswer) {
                    this.options.push(answer);
                } else {
                    let wrong = answer + (Math.floor(Math.random() * 6) - 3);
                    while (wrong === answer || this.options.includes(wrong)) {
                        wrong = answer + (Math.floor(Math.random() * 10) - 5);
                    }
                    this.options.push(wrong);
                }
            }
        } else if (type === 'color') {
            const colorNames = ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Mor', 'Turuncu'];
            const colorValues = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#800080', '#FFA500'];
            const idx = Math.floor(Math.random() * colorNames.length);

            this.puzzle = {
                type: 'color',
                question: 'Bu renk hangisi?',
                displayColor: colorValues[idx]
            };

            this.correctAnswer = Math.floor(Math.random() * 4);
            this.options = [];
            const usedIndices = [idx];

            for (let i = 0; i < 4; i++) {
                if (i === this.correctAnswer) {
                    this.options.push(colorNames[idx]);
                } else {
                    let wrongIdx;
                    do {
                        wrongIdx = Math.floor(Math.random() * colorNames.length);
                    } while (usedIndices.includes(wrongIdx));
                    usedIndices.push(wrongIdx);
                    this.options.push(colorNames[wrongIdx]);
                }
            }
        } else {
            const shapes = ['Daire', 'Kare', 'Üçgen', 'Yıldız'];
            const shapeIdx = Math.floor(Math.random() * shapes.length);

            this.puzzle = {
                type: 'shape',
                question: 'Bu şekil hangisi?',
                shape: shapes[shapeIdx]
            };

            this.correctAnswer = Math.floor(Math.random() * 4);
            this.options = [];
            const usedShapes = [shapeIdx];

            for (let i = 0; i < 4; i++) {
                if (i === this.correctAnswer) {
                    this.options.push(shapes[shapeIdx]);
                } else {
                    let wrongIdx;
                    do {
                        wrongIdx = Math.floor(Math.random() * shapes.length);
                    } while (usedShapes.includes(wrongIdx));
                    usedShapes.push(wrongIdx);
                    this.options.push(shapes[wrongIdx]);
                }
            }
        }
    }

    start() {
        this.running = true;
        this.gameLoop();
    }

    stop() {
        this.running = false;
    }

    handleInput(input) {
        if (this.phase !== 'answering') return;

        const player = this.playerData.find(p => p.playerNumber === input.playerNumber);
        if (!player || player.answered) return;

        // Answer with buttons or joystick
        let answer = -1;
        if (input.buttonA) answer = 0; // A = ilk seçenek
        if (input.buttonB) answer = 1; // B = ikinci seçenek
        if (input.joystickY < -0.5) answer = 0; // Yukarı = 1
        if (input.joystickY > 0.5) answer = 1;  // Aşağı = 2
        if (input.joystickX < -0.5) answer = 2; // Sol = 3
        if (input.joystickX > 0.5) answer = 3;  // Sağ = 4

        if (answer >= 0 && answer < 4) {
            player.answered = true;
            player.correct = (answer === this.correctAnswer);

            if (player.correct) {
                const bonus = Math.max(1, Math.floor(this.timer / 10));
                player.score += 10 + bonus;
                this.particles.emit(this.canvas.width / 2, this.canvas.height / 2, player.color, 20);
            } else {
                player.score = Math.max(0, player.score - 5);
            }
        }

        this.inputs[input.playerNumber] = input;
    }

    gameLoop() {
        if (!this.running) return;
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.timer--;

        if (this.phase === 'showing' && this.timer <= 0) {
            this.phase = 'answering';
            this.timer = this.timeLimit - this.level * 10; // Faster each level
            this.timer = Math.max(60, this.timer);
        } else if (this.phase === 'answering') {
            if (this.timer <= 0 || this.playerData.every(p => p.answered)) {
                this.phase = 'result';
                this.timer = 90; // 1.5 seconds to show result
            }
        } else if (this.phase === 'result' && this.timer <= 0) {
            if (this.round >= this.maxRounds) {
                this.phase = 'gameover';
            } else {
                this.level = Math.floor(this.round / 3) + 1;
                this.generatePuzzle();
            }
        }

        this.particles.update();
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);

        // Progress
        ctx.font = '16px Orbitron';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'center';
        ctx.fillText(`Soru ${this.round}/${this.maxRounds} • Level ${this.level}`, w / 2, 30);

        // Timer bar
        if (this.phase === 'answering') {
            const maxTime = this.timeLimit - this.level * 10;
            const ratio = Math.max(0, this.timer / Math.max(60, maxTime));

            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(50, 50, w - 100, 10);

            ctx.fillStyle = ratio > 0.3 ? '#10b981' : '#ef4444';
            ctx.fillRect(50, 50, (w - 100) * ratio, 10);
        }

        // Puzzle content
        ctx.textAlign = 'center';

        if (this.phase === 'showing' || this.phase === 'answering') {
            // Question
            ctx.font = 'bold 40px Orbitron';
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#8b5cf6';

            if (this.puzzle.type === 'color') {
                ctx.fillText(this.puzzle.question, w / 2, h / 3);
                ctx.fillStyle = this.puzzle.displayColor;
                ctx.shadowColor = this.puzzle.displayColor;
                ctx.beginPath();
                ctx.arc(w / 2, h / 2 - 30, 50, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.puzzle.type === 'shape') {
                ctx.fillText(this.puzzle.question, w / 2, h / 3);
                ctx.fillStyle = '#8b5cf6';
                ctx.shadowColor = '#8b5cf6';

                const cx = w / 2;
                const cy = h / 2 - 30;

                if (this.puzzle.shape === 'Daire') {
                    ctx.beginPath();
                    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
                    ctx.fill();
                } else if (this.puzzle.shape === 'Kare') {
                    ctx.fillRect(cx - 40, cy - 40, 80, 80);
                } else if (this.puzzle.shape === 'Üçgen') {
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - 45);
                    ctx.lineTo(cx - 45, cy + 35);
                    ctx.lineTo(cx + 45, cy + 35);
                    ctx.closePath();
                    ctx.fill();
                } else if (this.puzzle.shape === 'Yıldız') {
                    this.drawStar(ctx, cx, cy, 5, 45, 20);
                }
            } else {
                ctx.fillText(this.puzzle.question, w / 2, h / 2 - 50);
            }

            ctx.shadowBlur = 0;

            // Options (2x2 grid)
            if (this.phase === 'answering') {
                const optionPositions = [
                    { x: w / 3, y: h / 2 + 80, label: '↑ / A' },
                    { x: 2 * w / 3, y: h / 2 + 80, label: '↓ / B' },
                    { x: w / 3, y: h / 2 + 160, label: '←' },
                    { x: 2 * w / 3, y: h / 2 + 160, label: '→' }
                ];

                this.options.forEach((option, i) => {
                    const pos = optionPositions[i];

                    ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
                    ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(pos.x - 80, pos.y - 30, 160, 60, 10);
                    ctx.fill();
                    ctx.stroke();

                    ctx.font = 'bold 24px Orbitron';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(option, pos.x, pos.y + 8);

                    ctx.font = '10px Inter';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.fillText(pos.label, pos.x, pos.y + 35);
                });
            }
        } else if (this.phase === 'result') {
            ctx.font = 'bold 50px Orbitron';
            ctx.fillStyle = '#10b981';
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#10b981';
            ctx.fillText(`Doğru Cevap: ${this.options[this.correctAnswer]}`, w / 2, h / 2);
            ctx.shadowBlur = 0;
        } else if (this.phase === 'gameover') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, w, h);

            const winner = [...this.playerData].sort((a, b) => b.score - a.score)[0];

            ctx.font = 'bold 50px Orbitron';
            ctx.fillStyle = winner.color;
            ctx.shadowBlur = 40;
            ctx.shadowColor = winner.color;
            ctx.fillText('🧠 KAZANAN 🧠', w / 2, h / 2 - 40);
            ctx.fillText(winner.name, w / 2, h / 2 + 30);

            ctx.font = '24px Inter';
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 0;
            ctx.fillText(`${winner.score} puan`, w / 2, h / 2 + 80);
        }

        // Player scores
        const panelWidth = Math.min(180, w / this.playerData.length - 10);
        this.playerData.forEach((player, i) => {
            const x = 10 + i * (panelWidth + 10);
            const y = h - 70;

            ctx.fillStyle = player.answered ?
                (player.correct ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)') :
                'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(x, y, panelWidth, 60);

            ctx.font = 'bold 12px Inter';
            ctx.fillStyle = player.color;
            ctx.textAlign = 'left';
            ctx.fillText(player.name, x + 10, y + 20);

            ctx.font = 'bold 20px Orbitron';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(player.score, x + 10, y + 48);

            if (player.answered) {
                ctx.font = '20px Arial';
                ctx.fillText(player.correct ? '✓' : '✗', x + panelWidth - 30, y + 40);
            }
        });

        // Particles
        this.particles.draw(ctx);
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);

        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }

        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }
}

// ===================================
// DUEL ARENA GAME - TOP-DOWN SHOOTER
// ===================================
class DuelGame {
    constructor(canvas, players, socket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.players = players;
        this.socket = socket;
        this.running = false;
        this.lastTime = 0;

        this.particles = new ParticleSystem();

        // Game config
        this.PLAYER_SPEED = 4;
        this.BULLET_SPEED = 12;
        this.SHOOT_COOLDOWN = 250;
        this.DASH_COOLDOWN = 2000;
        this.DASH_SPEED = 15;
        this.DASH_DURATION = 150;
        this.KNOCKBACK = 6;
        this.ROUND_TIME = 60;
        this.ROUNDS_TO_WIN = 3;
        this.PLAYER_RADIUS = 20;
        this.BULLET_DAMAGE = 10;

        this.init();
    }

    init() {
        const colors = ['#4ECDC4', '#FF6B6B'];
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Arena bounds (with padding)
        this.arena = {
            x: 50,
            y: 100,
            width: w - 100,
            height: h - 150
        };

        // Obstacles (cover)
        this.obstacles = [
            { x: w / 2 - 40, y: h / 2 - 60, width: 80, height: 120 },
            { x: w / 4 - 30, y: h / 2 - 25, width: 60, height: 50 },
            { x: w * 3 / 4 - 30, y: h / 2 - 25, width: 60, height: 50 }
        ];

        // Create fighters
        this.fighters = this.players.slice(0, 2).map((player, i) => ({
            x: i === 0 ? this.arena.x + 100 : this.arena.x + this.arena.width - 100,
            y: this.arena.y + this.arena.height / 2,
            vx: 0,
            vy: 0,
            color: player.color || colors[i],
            name: player.name,
            playerNumber: player.number,
            health: 100,
            maxHealth: 100,
            aimAngle: i === 0 ? 0 : Math.PI,
            lastShot: 0,
            lastDash: 0,
            dashEndTime: 0,
            invincible: 0,
            score: 0,
            state: 'idle' // idle, move, shoot, hit, dash
        }));

        this.bullets = [];
        this.inputs = {};
        this.roundTime = this.ROUND_TIME;
        this.gameState = 'playing';
        this.roundTimer = null;
        this.roundNumber = 1;

        this.startRoundTimer();
    }

    startRoundTimer() {
        if (this.roundTimer) clearInterval(this.roundTimer);
        this.roundTimer = setInterval(() => {
            if (this.gameState === 'playing' && this.running) {
                this.roundTime--;
                if (this.roundTime <= 0) this.endRound();
            }
        }, 1000);
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    stop() {
        this.running = false;
        if (this.roundTimer) clearInterval(this.roundTimer);
    }

    handleInput(input) {
        this.inputs[input.playerNumber] = input;
    }

    endRound() {
        this.gameState = 'roundEnd';

        // Determine round winner
        if (this.fighters[0].health > this.fighters[1].health) {
            this.fighters[0].score++;
        } else if (this.fighters[1].health > this.fighters[0].health) {
            this.fighters[1].score++;
        }

        // Check game winner
        const winner = this.fighters.find(f => f.score >= this.ROUNDS_TO_WIN);
        if (winner) {
            this.gameState = 'gameEnd';
        } else {
            this.roundNumber++;
            setTimeout(() => this.resetRound(), 2000);
        }
    }

    resetRound() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.fighters[0].x = this.arena.x + 100;
        this.fighters[0].y = this.arena.y + this.arena.height / 2;
        this.fighters[0].health = 100;
        this.fighters[0].vx = 0;
        this.fighters[0].vy = 0;
        this.fighters[0].aimAngle = 0;

        this.fighters[1].x = this.arena.x + this.arena.width - 100;
        this.fighters[1].y = this.arena.y + this.arena.height / 2;
        this.fighters[1].health = 100;
        this.fighters[1].vx = 0;
        this.fighters[1].vy = 0;
        this.fighters[1].aimAngle = Math.PI;

        this.bullets = [];
        this.roundTime = this.ROUND_TIME;
        this.gameState = 'playing';
    }

    gameLoop() {
        if (!this.running) return;

        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 16.67, 2); // Normalize to ~60fps
        this.lastTime = now;

        this.update(dt);
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update(dt) {
        if (this.gameState !== 'playing') return;

        const now = Date.now();

        this.fighters.forEach((fighter, idx) => {
            const input = this.inputs[fighter.playerNumber] || {};
            const isDashing = now < fighter.dashEndTime;

            // Movement from joystick (360° top-down)
            if (!isDashing) {
                const moveX = input.joystickX || 0;
                const moveY = input.joystickY || 0;
                const moveLen = Math.sqrt(moveX * moveX + moveY * moveY);

                if (moveLen > 0.1) {
                    fighter.vx = (moveX / Math.max(1, moveLen)) * this.PLAYER_SPEED;
                    fighter.vy = (moveY / Math.max(1, moveLen)) * this.PLAYER_SPEED;
                    fighter.state = 'move';
                } else {
                    fighter.vx *= 0.8;
                    fighter.vy *= 0.8;
                    if (Math.abs(fighter.vx) < 0.1) fighter.vx = 0;
                    if (Math.abs(fighter.vy) < 0.1) fighter.vy = 0;
                    fighter.state = 'idle';
                }
            }

            // Dash with A button
            if (input.buttonA && now - fighter.lastDash >= this.DASH_COOLDOWN && !isDashing) {
                fighter.lastDash = now;
                fighter.dashEndTime = now + this.DASH_DURATION;
                fighter.invincible = 10; // Brief invincibility

                // Dash in movement direction or aim direction
                const dashAngle = (Math.abs(fighter.vx) > 0.1 || Math.abs(fighter.vy) > 0.1)
                    ? Math.atan2(fighter.vy, fighter.vx)
                    : fighter.aimAngle;
                fighter.vx = Math.cos(dashAngle) * this.DASH_SPEED;
                fighter.vy = Math.sin(dashAngle) * this.DASH_SPEED;
                fighter.state = 'dash';

                this.particles.emit(fighter.x, fighter.y, fighter.color, 15);
            }

            // Update aim from joystick direction (for controller)
            const aimX = input.joystickX || 0;
            const aimY = input.joystickY || 0;
            if (Math.abs(aimX) > 0.3 || Math.abs(aimY) > 0.3) {
                fighter.aimAngle = Math.atan2(aimY, aimX);
            }

            // Shooting with B button
            if (input.buttonB && now - fighter.lastShot >= this.SHOOT_COOLDOWN) {
                fighter.lastShot = now;
                fighter.state = 'shoot';

                const bulletX = fighter.x + Math.cos(fighter.aimAngle) * (this.PLAYER_RADIUS + 10);
                const bulletY = fighter.y + Math.sin(fighter.aimAngle) * (this.PLAYER_RADIUS + 10);

                this.bullets.push({
                    x: bulletX,
                    y: bulletY,
                    vx: Math.cos(fighter.aimAngle) * this.BULLET_SPEED,
                    vy: Math.sin(fighter.aimAngle) * this.BULLET_SPEED,
                    owner: idx,
                    active: true
                });

                // Muzzle flash particles
                this.particles.emit(bulletX, bulletY, '#ffff00', 8);
            }

            // Position update
            fighter.x += fighter.vx * dt;
            fighter.y += fighter.vy * dt;

            // Arena bounds collision
            fighter.x = Math.max(this.arena.x + this.PLAYER_RADIUS,
                Math.min(this.arena.x + this.arena.width - this.PLAYER_RADIUS, fighter.x));
            fighter.y = Math.max(this.arena.y + this.PLAYER_RADIUS,
                Math.min(this.arena.y + this.arena.height - this.PLAYER_RADIUS, fighter.y));

            // Obstacle collision
            this.obstacles.forEach(obs => {
                const closestX = Math.max(obs.x, Math.min(fighter.x, obs.x + obs.width));
                const closestY = Math.max(obs.y, Math.min(fighter.y, obs.y + obs.height));
                const dx = fighter.x - closestX;
                const dy = fighter.y - closestY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.PLAYER_RADIUS) {
                    const overlap = this.PLAYER_RADIUS - dist;
                    if (dist > 0) {
                        fighter.x += (dx / dist) * overlap;
                        fighter.y += (dy / dist) * overlap;
                    }
                }
            });

            // Invincibility timer
            if (fighter.invincible > 0) fighter.invincible--;
        });

        // Update bullets
        this.bullets.forEach(bullet => {
            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;

            // Arena bounds
            if (bullet.x < this.arena.x || bullet.x > this.arena.x + this.arena.width ||
                bullet.y < this.arena.y || bullet.y > this.arena.y + this.arena.height) {
                bullet.active = false;
            }

            // Obstacle collision
            this.obstacles.forEach(obs => {
                if (bullet.x > obs.x && bullet.x < obs.x + obs.width &&
                    bullet.y > obs.y && bullet.y < obs.y + obs.height) {
                    bullet.active = false;
                    this.particles.emit(bullet.x, bullet.y, '#888', 5);
                }
            });

            // Hit detection
            this.fighters.forEach((fighter, idx) => {
                if (idx === bullet.owner || !bullet.active) return;
                if (fighter.invincible > 0) return;

                const dx = bullet.x - fighter.x;
                const dy = bullet.y - fighter.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.PLAYER_RADIUS + 5) {
                    fighter.health -= this.BULLET_DAMAGE;
                    fighter.state = 'hit';

                    // Knockback
                    const knockAngle = Math.atan2(dy, dx);
                    fighter.vx = Math.cos(knockAngle) * this.KNOCKBACK;
                    fighter.vy = Math.sin(knockAngle) * this.KNOCKBACK;
                    fighter.invincible = 15;

                    bullet.active = false;
                    this.particles.emit(bullet.x, bullet.y, '#ff8800', 20);
                }
            });
        });

        this.bullets = this.bullets.filter(b => b.active);

        // Check death
        this.fighters.forEach(fighter => {
            if (fighter.health <= 0) {
                this.endRound();
            }
        });

        this.particles.update();
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);

        // Arena floor
        ctx.fillStyle = '#16213e';
        ctx.fillRect(this.arena.x, this.arena.y, this.arena.width, this.arena.height);

        // Arena grid
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
        ctx.lineWidth = 1;
        for (let x = this.arena.x; x <= this.arena.x + this.arena.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, this.arena.y);
            ctx.lineTo(x, this.arena.y + this.arena.height);
            ctx.stroke();
        }
        for (let y = this.arena.y; y <= this.arena.y + this.arena.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(this.arena.x, y);
            ctx.lineTo(this.arena.x + this.arena.width, y);
            ctx.stroke();
        }

        // Arena border
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.arena.x, this.arena.y, this.arena.width, this.arena.height);

        // Obstacles
        ctx.fillStyle = '#2d3561';
        this.obstacles.forEach(obs => {
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            ctx.strokeStyle = '#4d5581';
            ctx.lineWidth = 2;
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        });

        // Fighters
        this.fighters.forEach((fighter, idx) => {
            const isInvincible = fighter.invincible > 0;
            const isDashing = Date.now() < fighter.dashEndTime;

            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(fighter.x, fighter.y + 5, this.PLAYER_RADIUS, this.PLAYER_RADIUS * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Body
            ctx.fillStyle = isInvincible && fighter.invincible % 4 < 2 ? '#ffffff' : fighter.color;
            ctx.shadowBlur = isDashing ? 20 : 10;
            ctx.shadowColor = fighter.color;
            ctx.beginPath();
            ctx.arc(fighter.x, fighter.y, this.PLAYER_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Direction indicator / gun
            ctx.save();
            ctx.translate(fighter.x, fighter.y);
            ctx.rotate(fighter.aimAngle);

            // Gun barrel
            ctx.fillStyle = '#333';
            ctx.fillRect(this.PLAYER_RADIUS - 5, -4, 20, 8);

            // Gun tip
            ctx.fillStyle = '#555';
            ctx.fillRect(this.PLAYER_RADIUS + 10, -3, 5, 6);

            ctx.restore();

            // Player number indicator
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(`P${idx + 1}`, fighter.x, fighter.y + 5);

            // Name above
            ctx.fillStyle = fighter.color;
            ctx.font = 'bold 11px Inter';
            ctx.fillText(fighter.name, fighter.x, fighter.y - this.PLAYER_RADIUS - 10);

            // Health bar above name
            const hpBarWidth = 50;
            const hpPercent = Math.max(0, fighter.health / 100);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(fighter.x - hpBarWidth / 2, fighter.y - this.PLAYER_RADIUS - 25, hpBarWidth, 6);
            ctx.fillStyle = hpPercent > 0.3 ? fighter.color : '#ff4444';
            ctx.fillRect(fighter.x - hpBarWidth / 2, fighter.y - this.PLAYER_RADIUS - 25, hpBarWidth * hpPercent, 6);
        });

        // Bullets
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffff00';
        ctx.fillStyle = '#ffff00';
        this.bullets.forEach(b => {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur = 0;

        // Particles
        this.particles.draw(ctx);

        // UI
        this.drawUI();

        // Round/game end overlay
        if (this.gameState === 'roundEnd' || this.gameState === 'gameEnd') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, w, h);

            ctx.textAlign = 'center';
            ctx.font = 'bold 48px Orbitron';

            if (this.gameState === 'gameEnd') {
                const winner = this.fighters[0].score > this.fighters[1].score ? this.fighters[0] : this.fighters[1];
                ctx.fillStyle = winner.color;
                ctx.fillText(`${winner.name} KAZANDI!`, w / 2, h / 2);
                ctx.font = '24px Inter';
                ctx.fillStyle = '#fff';
                ctx.fillText(`${this.fighters[0].score} - ${this.fighters[1].score}`, w / 2, h / 2 + 50);
            } else {
                ctx.fillStyle = '#fff';
                ctx.fillText('RAUND BİTTİ', w / 2, h / 2);

                const roundWinner = this.fighters[0].health > this.fighters[1].health ? this.fighters[0] :
                    this.fighters[1].health > this.fighters[0].health ? this.fighters[1] : null;
                if (roundWinner) {
                    ctx.font = '24px Inter';
                    ctx.fillStyle = roundWinner.color;
                    ctx.fillText(`${roundWinner.name} raund kazandı!`, w / 2, h / 2 + 50);
                }
            }
        }
    }

    drawUI() {
        const ctx = this.ctx;
        const w = this.canvas.width;

        // Health bars at top
        const barWidth = 200;
        const barHeight = 25;
        const barY = 20;

        // P1 health (left)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(20, barY, barWidth + 4, barHeight + 4);
        const p1Hp = Math.max(0, this.fighters[0].health / 100);
        ctx.fillStyle = this.fighters[0].color;
        ctx.fillRect(22, barY + 2, barWidth * p1Hp, barHeight);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(this.fighters[0].name, 25, barY + 18);

        // P2 health (right)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(w - 24 - barWidth, barY, barWidth + 4, barHeight + 4);
        const p2Hp = Math.max(0, this.fighters[1].health / 100);
        ctx.fillStyle = this.fighters[1].color;
        ctx.fillRect(w - 22 - barWidth * p2Hp, barY + 2, barWidth * p2Hp, barHeight);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.fillText(this.fighters[1].name, w - 25, barY + 18);

        // Round scores (center top)
        ctx.textAlign = 'center';
        ctx.font = 'bold 32px Orbitron';
        ctx.fillStyle = this.fighters[0].color;
        ctx.fillText(this.fighters[0].score, w / 2 - 50, 45);
        ctx.fillStyle = '#fff';
        ctx.fillText('-', w / 2, 45);
        ctx.fillStyle = this.fighters[1].color;
        ctx.fillText(this.fighters[1].score, w / 2 + 50, 45);

        // Round number
        ctx.font = '14px Inter';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText(`RAUND ${this.roundNumber}`, w / 2, 65);

        // Timer
        ctx.font = 'bold 28px Orbitron';
        ctx.fillStyle = this.roundTime <= 10 ? '#ff4444' : '#ffffff';
        ctx.fillText(this.roundTime, w / 2, 95);

        // Controls hint
        ctx.font = '12px Inter';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText('🕹️ Joystick = Hareket/Nişan | A = Dash | B = Ateş', w / 2, this.canvas.height - 15);
    }
}












































