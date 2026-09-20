import Spinner from "../components/Spinner.js";

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="leaderboard-container">
            <Spinner></Spinner>
        </main>

        <div v-else class="leaderboard-container">
            
            <!-- ВЕРХНЯЯ ПАНЕЛЬ (ЗАГОЛОВОК, ПОИСК, КНОПКА) -->
            <div class="leaderboard-header">
                <div class="header-info">
                    <h1>Leaderboard</h1>
                    <p>Топ игроков по набранным очкам</p>
                </div>
                <div class="header-controls">
                    <input 
                        type="text" 
                        v-model="searchQuery" 
                        placeholder="Поиск игрока..." 
                        class="search-input"
                    />
                    <button class="btn-primary" @click="showAddModal = true">+ Добавить игрока</button>
                </div>
            </div>

            <!-- ТАБЛИЦА ЛИДЕРОВ -->
            <div class="table-wrapper">
                <table class="leaderboard-table">
                    <thead>
                        <tr>
                            <th class="th-rank">#</th>
                            <th class="th-player">Игрок</th>
                            <th class="th-demons">Демоны</th>
                            <th class="th-points">Очки</th>
                            <th class="th-actions"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr 
                            v-for="(player, index) in filteredList" 
                            :key="player.id || player.name"
                            :class="{ 'selected-row': isSelected(player) }"
                            @click="toggleSelectPlayer(player)"
                        >
                            <!-- РАНГ -->
                            <td class="td-rank">
                                <span class="rank-number" :class="'rank-' + (index + 1)">
                                    #{{ index + 1 }}
                                </span>
                            </td>

                            <!-- ИГРОК И ФЛАГ -->
                            <td class="td-player">
                                <div class="player-cell">
                                    <img 
                                        v-if="player.country" 
                                        :src="getFlagUrl(player.country)" 
                                        class="flag-icon" 
                                        :title="player.country.toUpperCase()" 
                                    />
                                    <img :src="getAvatar(player)" @error="onImageError" class="player-avatar" />
                                    <span class="player-name">{{ player.name }}</span>
                                </div>
                            </td>

                            <!-- КОЛИЧЕСТВО ДЕМОНОВ -->
                            <td class="td-demons">
                                {{ player.demonsCount || (player.demons ? player.demons.length : 0) }}
                            </td>

                            <!-- ОЧКИ -->
                            <td class="td-points">
                                <strong>{{ player.points || 0 }}</strong> <small>pts</small>
                            </td>

                            <!-- УПРАВЛЕНИЕ -->
                            <td class="td-actions" @click.stop>
                                <button class="btn-del-sm" @click="removePlayer(index)" title="Удалить игрока">✕</button>
                            </td>
                        </tr>

                        <tr v-if="filteredList.length === 0">
                            <td colspan="5" class="empty-table">
                                Игроки не найдены.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- ДЕТАЛИ ВЫБРАННОГО ИГРОКА (ПОД ТАБЛИЦЕЙ) -->
            <div class="player-details-card" v-if="selectedPlayer">
                <div class="details-header">
                    <div class="details-user">
                        <img v-if="selectedPlayer.country" :src="getFlagUrl(selectedPlayer.country)" class="flag-icon-lg" />
                        <h2>#{{ getPlayerRank(selectedPlayer) }} — {{ selectedPlayer.name }}</h2>
                    </div>
                    <button class="btn-small" @click="showAddDemonModal = true">+ Засчитать уровень</button>
                </div>

                <div class="player-stats">
                    <div class="stat-box">
                        <span>Всего очков</span>
                        <strong>{{ selectedPlayer.points || 0 }} pts</strong>
                    </div>
                    <div class="stat-box">
                        <span>Страна</span>
                        <strong>{{ selectedPlayer.country ? selectedPlayer.country.toUpperCase() : 'Не указана' }}</strong>
                    </div>
                    <div class="stat-box">
                        <span>Пройдено уровней</span>
                        <strong>{{ selectedPlayer.demons ? selectedPlayer.demons.length : 0 }}</strong>
                    </div>
                </div>

                <!-- СПИСОК ПРОЙДЕННЫХ УРОВНЕЙ -->
                <div class="player-records">
                    <h3>Пройденные демоны</h3>
                    <div class="records-grid" v-if="selectedPlayer.demons && selectedPlayer.demons.length">
                        <div class="record-item" v-for="(dem, dIdx) in selectedPlayer.demons" :key="dIdx">
                            <div class="rec-details">
                                <span class="rec-name">{{ dem.name }}</span>
                                <span class="rec-meta">{{ dem.percent || 100 }}% — {{ dem.points || 0 }} pts</span>
                            </div>
                            <div class="rec-actions">
                                <a v-if="dem.video" :href="dem.video" target="_blank" class="rec-link">Proof ↗</a>
                                <button class="btn-del-sm" @click="removeDemon(dIdx)">✕</button>
                            </div>
                        </div>
                    </div>
                    <p v-else class="empty-text">У этого игрока ещё нет подтверждённых прохождений.</p>
                </div>
            </div>

            <!-- МОДАЛКА: ДОБАВИТЬ ИГРОКА -->
            <div class="modal-overlay" v-if="showAddModal" @click.self="showAddModal = false">
                <div class="modal-body">
                    <h3>Добавить игрока</h3>
                    <form @submit.prevent="addPlayer">
                        <label>Никнейм игрока:
                            <input v-model="newPlayer.name" required placeholder="Zoink" />
                        </label>
                        <label>Код страны (2 буквы, например: ru, us, ua, kr, de):
                            <input v-model="newPlayer.country" placeholder="us" style="text-transform: lowercase;" maxLength="2" />
                        </label>
                        <label>Ссылка на аватарку (необязательно):
                            <input v-model="newPlayer.avatar" placeholder="https://..." />
                        </label>
                        <label>Начальные очки:
                            <input type="number" v-model.number="newPlayer.points" placeholder="1000" />
                        </label>
                        <div class="modal-actions">
                            <button type="submit" class="btn-primary">Сохранить</button>
                            <button type="button" class="btn-secondary" @click="showAddModal = false">Отмена</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- МОДАЛКА: ДОБАВИТЬ ДЕМОН -->
            <div class="modal-overlay" v-if="showAddDemonModal" @click.self="showAddDemonModal = false">
                <div class="modal-body">
                    <h3>Прикрепить уровень игроку</h3>
                    <form @submit.prevent="addDemonToPlayer">
                        <label>Название уровня:
                            <input v-model="newDemon.name" required placeholder="Tidal Wave" />
                        </label>
                        <label>Процент (%):
                            <input type="number" v-model.number="newDemon.percent" value="100" min="1" max="100" required />
                        </label>
                        <label>Очки:
                            <input type="number" v-model.number="newDemon.points" placeholder="350" required />
                        </label>
                        <label>Ссылка на видео:
                            <input v-model="newDemon.video" placeholder="https://youtu.be/..." />
                        </label>
                        <div class="modal-actions">
                            <button type="submit" class="btn-primary">Добавить</button>
                            <button type="button" class="btn-secondary" @click="showAddDemonModal = false">Отмена</button>
                        </div>
                    </form>
                </div>
            </div>

        </div>
    `,

    data: () => ({
        list: [],
        loading: true,
        selectedPlayer: null,
        searchQuery: "",
        showAddModal: false,
        showAddDemonModal: false,
        newPlayer: { name: "", country: "", avatar: "", points: 0 },
        newDemon: { name: "", percent: 100, points: 100, video: "" }
    }),

    computed: {
        filteredList() {
            let res = [...this.list];
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase().trim();
                res = res.filter(item => item.name && item.name.toLowerCase().includes(q));
            }
            // Автоматическая сортировка по очкам от большего к меньшему
            return res.sort((a, b) => (b.points || 0) - (a.points || 0));
        }
    },

    mounted() {
        this.loadData();
    },

    methods: {
        loadData() {
            const savedData = localStorage.getItem('pointercrate_leaderboard');

            if (savedData) {
                this.list = JSON.parse(savedData);
            } else {
                this.list = [
                    { 
                        id: 1, 
                        name: "Zoink", 
                        country: "us",
                        avatar: "", 
                        points: 3500,
                        demonsCount: 2,
                        demons: [
                            { name: "Tidal Wave", percent: 100, points: 500, video: "https://youtu.be/..." },
                            { name: "Acheron", percent: 100, points: 450, video: "https://youtu.be/..." }
                        ]
                    },
                    { 
                        id: 2, 
                        name: "Doggie", 
                        country: "us",
                        avatar: "", 
                        points: 2900,
                        demonsCount: 1,
                        demons: [
                            { name: "Slaughterhouse", percent: 100, points: 400, video: "https://youtu.be/..." }
                        ]
                    },
                    { 
                        id: 3, 
                        name: "Trick", 
                        country: "us",
                        avatar: "", 
                        points: 2750,
                        demonsCount: 0,
                        demons: []
                    }
                ];
            }

            this.selectedPlayer = null;
            this.loading = false;
        },

        saveData() {
            localStorage.setItem('pointercrate_leaderboard', JSON.stringify(this.list));
        },

        getFlagUrl(countryCode) {
            if (!countryCode) return '';
            const code = countryCode.toLowerCase().trim();
            return `https://flagcdn.com/24x18/${code}.png`;
        },

        getAvatar(player) {
            if (player.avatar && player.avatar.trim() !== "") {
                return player.avatar.trim();
            }
            return 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
        },

        onImageError(e) {
            e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
        },

        isSelected(player) {
            if (!this.selectedPlayer) return false;
            return this.selectedPlayer.id ? (this.selectedPlayer.id === player.id) : (this.selectedPlayer.name === player.name);
        },

        toggleSelectPlayer(player) {
            if (this.isSelected(player)) {
                this.selectedPlayer = null;
            } else {
                this.selectedPlayer = player;
            }
        },

        addPlayer() {
            const obj = {
                id: Date.now(),
                name: this.newPlayer.name,
                country: this.newPlayer.country ? this.newPlayer.country.toLowerCase().trim() : "",
                avatar: this.newPlayer.avatar,
                points: this.newPlayer.points || 0,
                demonsCount: 0,
                demons: []
            };

            this.list.push(obj);
            this.selectedPlayer = obj;
            this.saveData();

            this.showAddModal = false;
            this.newPlayer = { name: "", country: "", avatar: "", points: 0 };
        },

        removePlayer(index) {
            if (confirm(`Удалить игрока "${this.filteredList[index].name}" из лидерборда?`)) {
                const playerToRemove = this.filteredList[index];
                if (this.isSelected(playerToRemove)) {
                    this.selectedPlayer = null;
                }
                this.list = this.list.filter(p => p !== playerToRemove);
                this.saveData();
            }
        },

        addDemonToPlayer() {
            if (!this.selectedPlayer) return;
            if (!this.selectedPlayer.demons) this.selectedPlayer.demons = [];

            this.selectedPlayer.demons.push({ ...this.newDemon });
            this.selectedPlayer.demonsCount = this.selectedPlayer.demons.length;
            this.selectedPlayer.points = (this.selectedPlayer.points || 0) + (this.newDemon.points || 0);

            this.saveData();

            this.showAddDemonModal = false;
            this.newDemon = { name: "", percent: 100, points: 100, video: "" };
        },

        removeDemon(dIdx) {
            if (this.selectedPlayer && this.selectedPlayer.demons) {
                const removed = this.selectedPlayer.demons.splice(dIdx, 1)[0];
                if (removed && removed.points) {
                    this.selectedPlayer.points = Math.max(0, (this.selectedPlayer.points || 0) - removed.points);
                }
                this.selectedPlayer.demonsCount = this.selectedPlayer.demons.length;
                this.saveData();
            }
        },

        getPlayerRank(player) {
            const sorted = [...this.list].sort((a, b) => (b.points || 0) - (a.points || 0));
            return sorted.findIndex(i => (i.id ? i.id === player.id : i.name === player.name)) + 1;
        }
    }
};
