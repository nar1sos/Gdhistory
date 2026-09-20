import Spinner from "../components/Spinner.js";

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="pointer-wrapper">
            <Spinner></Spinner>
        </main>

        <div v-else class="pointer-wrapper">
            <div class="pointer-layout">
                
                <!-- ЛЕВАЯ КОЛОНКА: ЛИДЕРБОРД С АВАТАРКАМИ И DRAG & DROP -->
                <div class="list-side">
                    <div 
                        v-for="(player, index) in filteredLeaderboard" 
                        :key="player.id || player.name" 
                        class="pointer-card"
                        :class="{ 
                            'active': selectedPlayer?.name === player.name,
                            'dragging': dragIndex === index 
                        }"
                        draggable="true"
                        @dragstart="onDragStart(index, $event)"
                        @dragover.prevent="onDragOver(index)"
                        @drop="onDrop(index)"
                        @click="selectedPlayer = player"
                    >
                        <div class="drag-handle" title="Зажми ЛКМ и потяни, чтобы изменить ранг">⣿</div>
                        
                        <!-- АВАТАРКА ИГРОКА В СПИСКЕ -->
                        <div class="card-thumb player-avatar-thumb">
                            <img :src="getAvatar(player)" @error="onAvatarError" alt="Avatar" />
                        </div>

                        <div class="card-text">
                            <div class="card-title">#{{ index + 1 }} - {{ player.name }}</div>
                            <div class="card-sub">Пройдено демонов: <strong>{{ player.demons ? player.demons.length : 0 }}</strong></div>
                            <div class="card-pts"><strong>{{ player.points || calculatePoints(player) }}</strong> pts</div>
                        </div>

                        <button class="btn-delete" @click.stop="removePlayer(index)" title="Удалить игрока">✕</button>
                    </div>

                    <div v-if="leaderboard.length === 0" class="empty-msg">
                        Лидерборд пуст. Нажми «+ Добавить игрока» справа!
                    </div>
                </div>

                <!-- ПРАВАЯ КОЛОНКА: ПОИСК, ПРОФИЛЬ ИГРОКА, АДМИНКА -->
                <div class="details-side">
                    
                    <!-- ПОИСК И ДОБАВЛЕНИЕ ИГРОКА -->
                    <div class="side-box search-box">
                        <input 
                            type="text" 
                            v-model="searchQuery" 
                            placeholder="Поиск игрока..." 
                            class="search-input"
                        />
                        <button class="btn-primary" @click="showAddPlayerModal = true">+ Добавить игрока</button>
                    </div>

                    <!-- ИНФОРМАЦИЯ О ВЫБРАННОМ ИГРОКЕ -->
                    <div class="side-box" v-if="selectedPlayer">
                        <div class="player-profile-header">
                            <img :src="getAvatar(selectedPlayer)" @error="onAvatarError" class="profile-avatar" />
                            <div>
                                <h2 class="level-heading" style="margin: 0;">#{{ getPlayerRank(selectedPlayer) }} {{ selectedPlayer.name }}</h2>
                                <button class="btn-reset" style="text-align: left; padding: 0; margin-top: 4px;" @click="editAvatar(selectedPlayer)">Изменить аватарку</button>
                            </div>
                        </div>
                        
                        <div class="stats-row" style="margin-bottom: 15px;">
                            <div><span>POINTS</span> <strong>{{ selectedPlayer.points || calculatePoints(selectedPlayer) }}</strong></div>
                            <div><span>DEMONS</span> <strong>{{ selectedPlayer.demons ? selectedPlayer.demons.length : 0 }}</strong></div>
                        </div>

                        <!-- СПИСОК ПРОЙДЕННЫХ УРОВНЕЙ ИГРОКА -->
                        <div class="records-section">
                            <div class="records-header">
                                <h4>Пройденные уровни</h4>
                                <button class="btn-small" @click="showAddDemonModal = true">+ Демон</button>
                            </div>
                            <ul class="records-list" v-if="selectedPlayer.demons && selectedPlayer.demons.length">
                                <li v-for="(dem, dIdx) in selectedPlayer.demons" :key="dIdx">
                                    <div class="rec-info">
                                        <strong>{{ dem.name }}</strong> ({{ dem.percent || 100 }}%)
                                    </div>
                                    <button class="btn-del-sm" @click="removeDemonFromPlayer(dIdx)">✕</button>
                                </li>
                            </ul>
                            <p v-else class="empty-text">Нет прикрепленных прохождений.</p>
                        </div>
                    </div>

                </div>

            </div>

            <!-- МОДАЛКА: ДОБАВИТЬ ИГРОКА -->
            <div class="modal-overlay" v-if="showAddPlayerModal" @click.self="showAddPlayerModal = false">
                <div class="modal-body">
                    <h3>Добавить игрока в Leaderboard</h3>
                    <form @submit.prevent="addPlayer">
                        <label>Никнейм игрока:
                            <input v-model="newPlayer.name" required placeholder="например, Zoink" />
                        </label>
                        <label>URL аватарки (картинка):
                            <input v-model="newPlayer.avatar" placeholder="https://i.imgur.com/..." />
                        </label>
                        <label>Начальные очки (pts):
                            <input type="number" v-model.number="newPlayer.points" placeholder="1000" />
                        </label>
                        <div class="modal-actions">
                            <button type="submit" class="btn-primary">Сохранить</button>
                            <button type="button" class="btn-secondary" @click="showAddPlayerModal = false">Отмена</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- МОДАЛКА: ДОБАВИТЬ ДЕМОН ИГРОКУ -->
            <div class="modal-overlay" v-if="showAddDemonModal" @click.self="showAddDemonModal = false">
                <div class="modal-body">
                    <h3>Прикрепить пройденный демон</h3>
                    <form @submit.prevent="addDemonToPlayer">
                        <label>Название уровня:
                            <input v-model="newDemon.name" required placeholder="например, Tidal Wave" />
                        </label>
                        <label>Процент прохождения (%):
                            <input type="number" v-model.number="newDemon.percent" value="100" min="1" max="100" />
                        </label>
                        <div class="modal-actions">
                            <button type="submit" class="btn-primary">Прикрепить</button>
                            <button type="button" class="btn-secondary" @click="showAddDemonModal = false">Отмена</button>
                        </div>
                    </form>
                </div>
            </div>

        </div>
    `,

    data: () => ({
        leaderboard: [],
        loading: true,
        selectedPlayer: null,
        searchQuery: "",
        dragIndex: null,
        showAddPlayerModal: false,
        showAddDemonModal: false,
        newPlayer: { name: "", avatar: "", points: 0 },
        newDemon: { name: "", percent: 100 }
    }),

    computed: {
        filteredLeaderboard() {
            if (!this.searchQuery) return this.leaderboard;
            const q = this.searchQuery.toLowerCase().trim();
            return this.leaderboard.filter(p => p.name && p.name.toLowerCase().includes(q));
        }
    },

    mounted() {
        this.loadData();
    },

    methods: {
        loadData() {
            const savedLeaderboard = localStorage.getItem('custom_leaderboard');

            if (savedLeaderboard) {
                this.leaderboard = JSON.parse(savedLeaderboard);
            } else {
                this.leaderboard = [
                    { id: 1, name: "Твой Ник (Топ 1)", avatar: "", points: 2500, demons: [{ name: "Tidal Wave", percent: 100 }] },
                    { id: 2, name: "Zoink", avatar: "", points: 2100, demons: [{ name: "Acheron", percent: 100 }] },
                    { id: 3, name: "Doggie", avatar: "", points: 1800, demons: [{ name: "Grief", percent: 100 }] }
                ];
            }

            if (this.leaderboard.length > 0) {
                this.selectedPlayer = this.leaderboard[0];
            }
            this.loading = false;
        },

        saveData() {
            localStorage.setItem('custom_leaderboard', JSON.stringify(this.leaderboard));
        },

        /* DRAG & DROP */
        onDragStart(index, event) {
            this.dragIndex = index;
            event.dataTransfer.effectAllowed = "move";
        },

        onDragOver(index) {
            if (this.dragIndex === null || this.dragIndex === index) return;
            const movedPlayer = this.leaderboard.splice(this.dragIndex, 1)[0];
            this.leaderboard.splice(index, 0, movedPlayer);
            this.dragIndex = index;
        },

        onDrop() {
            this.dragIndex = null;
            this.saveData();
        },

        /* ИГРОКИ И АВАТАРКИ */
        addPlayer() {
            const playerObj = {
                id: Date.now(),
                name: this.newPlayer.name,
                avatar: this.newPlayer.avatar,
                points: this.newPlayer.points || 0,
                demons: []
            };

            this.leaderboard.push(playerObj);
            this.selectedPlayer = playerObj;
            this.saveData();

            this.showAddPlayerModal = false;
            this.newPlayer = { name: "", avatar: "", points: 0 };
        },

        editAvatar(player) {
            const newUrl = prompt("Введите новый URL аватарки:", player.avatar || "");
            if (newUrl !== null) {
                player.avatar = newUrl.trim();
                this.saveData();
            }
        },

        getAvatar(player) {
            if (player && player.avatar) return player.avatar;
            // Дефолтная иконка, если URL не указан
            return 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
        },

        onAvatarError(e) {
            e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
        },

        removePlayer(index) {
            if (confirm(`Удалить игрока "${this.leaderboard[index].name}" из лидерборда?`)) {
                const isSelected = this.selectedPlayer === this.leaderboard[index];
                this.leaderboard.splice(index, 1);
                if (isSelected) {
                    this.selectedPlayer = this.leaderboard[0] || null;
                }
                this.saveData();
            }
        },

        /* ДЕМОНЫ */
        addDemonToPlayer() {
            if (!this.selectedPlayer) return;
            if (!this.selectedPlayer.demons) this.selectedPlayer.demons = [];

            this.selectedPlayer.demons.push({ ...this.newDemon });
            this.saveData();

            this.showAddDemonModal = false;
            this.newDemon = { name: "", percent: 100 };
        },

        removeDemonFromPlayer(dIdx) {
            if (this.selectedPlayer && this.selectedPlayer.demons) {
                this.selectedPlayer.demons.splice(dIdx, 1);
                this.saveData();
            }
        },

        getPlayerRank(player) {
            return this.leaderboard.findIndex(p => p === player) + 1;
        },

        calculatePoints(player) {
            return player.demons ? player.demons.length * 100 : 0;
        }
    }
};
