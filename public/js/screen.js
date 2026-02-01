// Screen Controller - Main display logic
class ScreenController {
    constructor() {
        this.socket = io();
        this.roomCode = null;
        this.players = [];
        this.currentGame = null;
        this.gameInstance = null;

        this.screens = {
            connection: document.getElementById('connection-screen'),
            gameSelection: document.getElementById('game-selection'),
            game: document.getElementById('game-screen')
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.createRoom();
    }

    bindEvents() {
        // Button events
        document.getElementById('btn-browse-games').addEventListener('click', () => {
            this.showScreen('gameSelection');
        });

        document.getElementById('btn-back-to-lobby').addEventListener('click', () => {
            this.showScreen('connection');
        });

        document.getElementById('btn-end-game').addEventListener('click', () => {
            this.endGame();
        });

        // Socket events
        this.socket.on('player-joined', (player) => this.onPlayerJoined(player));
        this.socket.on('player-left', (data) => this.onPlayerLeft(data));
        this.socket.on('controller-input', (input) => this.onControllerInput(input));
    }

    createRoom() {
        this.socket.emit('create-room', (response) => {
            if (response.success) {
                this.roomCode = response.roomCode;
                document.getElementById('room-code').textContent = this.roomCode;
                console.log('Room created:', this.roomCode);
            }
        });
    }

    onPlayerJoined(player) {
        this.players.push(player);
        this.updatePlayersUI();
        document.getElementById('btn-browse-games').disabled = false;

        // Notify player with vibration-like effect on their controller
        this.socket.emit('game-state', { type: 'player-accepted', playerId: player.id });
    }

    onPlayerLeft(data) {
        this.players = this.players.filter(p => p.id !== data.playerId);
        this.updatePlayersUI();

        if (this.players.length === 0) {
            document.getElementById('btn-browse-games').disabled = true;
        }
    }

    updatePlayersUI() {
        const container = document.getElementById('players-list');

        if (this.players.length === 0) {
            container.innerHTML = '<div class="waiting-text">Oyuncular bekleniyor...</div>';
            return;
        }

        container.innerHTML = this.players.map(player => `
      <div class="player-badge">
        <div class="player-avatar" style="background: ${player.color}">${player.number}</div>
        <span class="player-name">${player.name}</span>
      </div>
    `).join('');

        // Update header count
        document.getElementById('header-player-count').textContent = `${this.players.length} Oyuncu`;
    }

    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => screen.classList.remove('active'));
        this.screens[screenName].classList.add('active');

        if (screenName === 'gameSelection') {
            this.loadGames();
        }
    }

    loadGames() {
        const grid = document.getElementById('games-grid');
        grid.innerHTML = GAMES.map(game => `
      <div class="game-card" data-game-id="${game.id}">
        <div class="game-card-image">${game.icon}</div>
        <div class="game-card-content">
          <div class="game-card-title">${game.title}</div>
          <div class="game-card-info">
            <span class="game-card-players">👥 ${game.minPlayers}-${game.maxPlayers}</span>
            <span class="game-card-category">${game.category}</span>
          </div>
        </div>
        <div class="game-card-overlay">
          <button class="play-btn">OYNA</button>
        </div>
      </div>
    `).join('');

        // Add click events
        grid.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                const gameId = card.dataset.gameId;
                this.startGame(gameId);
            });
        });
    }

    startGame(gameId) {
        const game = GAMES.find(g => g.id === gameId);
        if (!game) return;

        if (this.players.length < game.minPlayers) {
            alert(`Bu oyun için en az ${game.minPlayers} oyuncu gerekli!`);
            return;
        }

        this.currentGame = game;
        document.getElementById('current-game-title').textContent = game.title;
        this.showScreen('game');

        // Initialize game
        const canvas = document.getElementById('game-canvas');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        // Start the specific game
        if (game.id === 'pong') {
            this.gameInstance = new PongGame(canvas, this.players, this.socket);
        } else if (game.id === 'racing') {
            this.gameInstance = new RacingGame(canvas, this.players, this.socket);
        } else if (game.id === 'snake') {
            this.gameInstance = new SnakeGame(canvas, this.players, this.socket);
        } else if (game.id === 'reflex') {
            this.gameInstance = new ReflexGame(canvas, this.players, this.socket);
        } else if (game.id === 'cardodge') {
            this.gameInstance = new CarDodgeGame(canvas, this.players, this.socket);
        } else if (game.id === 'puzzle') {
            this.gameInstance = new PuzzleGame(canvas, this.players, this.socket);
        }

        if (this.gameInstance) {
            this.gameInstance.start();
        }

        // Notify controllers
        this.socket.emit('start-game', gameId);
    }

    onControllerInput(input) {
        if (this.gameInstance) {
            this.gameInstance.handleInput(input);
        }
    }

    endGame() {
        if (this.gameInstance) {
            this.gameInstance.stop();
            this.gameInstance = null;
        }

        this.currentGame = null;
        this.socket.emit('end-game');
        this.showScreen('gameSelection');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.screenController = new ScreenController();
});
