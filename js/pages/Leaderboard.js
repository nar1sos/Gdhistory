import Spinner from "../components/Spinner.js";

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="pointer-wrapper">
            <Spinner></Spinner>
        </main>

        <div v-else class="pointer-wrapper">
            <div class="pointer-layout">
                
                <!-- ЛЕВАЯ КОЛОНКА: СПИСОК ИГРОКОВ (В СТИЛЕ POINTERCRATE) -->
                <div class="list-side">
                    <div 
                        v-for="(player, index) in sortedList" 
                        :key="player.id || player.name" 
                        class="pointer-card"
                        :class="{ 'active': isSelected(player) }"
                        @click="toggleSelectPlayer(player)"
                    >
                        <!-- АВАТАРКА -->
                        <div class="card-thumb player-thumb">
                            <img :src="getAvatar(player)" @error="onImageError" alt="Avatar" />
                        </div>

                        <!-- ТЕКСТ КАРТОЧКИ -->
                        <div class="card-text">
                            <div class="card-title">
                                <img v-if="player.country" :src="getFlagUrl(player.country)" class="flag-icon" :title="player.country.toUpperCase()" />
                                #{{ index + 1 }} - {{ player.name }}
                            </div>
                            <div class="card-sub">Пройдено: <strong>{{ player.demons ? player.demons.length : 0 }} демонов</strong></div>
                            <div class="card-pts"><strong>{{ player.points || 0 }}</strong> pts</div>
                        </div>

                        <button class="btn-delete" @click.stop="removePlayer(player)" title="Удалить">✕</button>
                    </div>

                    <div v-if="sortedList.length === 0" class="empty-msg">
                        Игроки не найдены.
                    </div>
                </div>

                <!-- ПРАВАЯ КОЛОНКА: САЙДБАР (ПОИСК И ИНФО О ВЫБРАННОМ) -->
                <div class="details-side">
                    
                    <!-- ПОИСК И ДОБАВЛЕНИЕ -->
                    <div class="side-box search-box">
                        <input 
                            type="text" 
                            v-model="searchQuery" 
                            placeholder="Поиск игрока..." 
                            class="search-input"
                        />
                        <button class="btn-primary" @click="showAddModal = true">+ Добавить</button>
                    </div>

                    <!-- ИНФОРМАЦИЯ О ВЫБРАННОМ ИГРОКЕ -->
                    <div class="side-box" v-if="selectedPlayer">
                        <div class="player-profile-header">
                            <img v-if="selectedPlayer.country" :src="getFlagUrl(selectedPlayer.country)" class="flag-icon-large" />
                            <h2 class="level-heading" style="margin: 0;">#{{ getPlayerRank(selectedPlayer) }} {{ selectedPlayer.name }}</h2>
                        </div>
                        
                        <div class="stats-row" style="margin: 15px 0;">
                            <div><span>POINTS</span> <strong>{{ selectedPlayer.points || 0 }}</strong></div>
                            <div><span>DEMONS</span> <strong>{{ selectedPlayer.demons ? selectedPlayer.demons.length : 0 }}</strong></div>
                        </div>

                        <!-- СПИСОК ПРОЙДЕННЫХ УРОВНЕЙ -->
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
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <a v-if="dem.video" :href="dem.video" target="_blank" class="rec-link">Пруф ↗</a>
                                        <button class="btn-del-sm" @click="removeDemon(dIdx)">✕</button>
                                    </div>
                                </li>
                            </ul>
                            <p v-else class="empty-text">Нет зачтённых прохождений.</p>
                        </div>
                    </div>

                    <!-- ЕСЛИ ВЫДЕЛЕНИЕ СНЯТО (НИЧЕГО НЕ ВЫБРАНО) -->
                    <div class="side-box empty-msg" v-else style="text-align: center; color: #888; padding: 30px 15px;">
                        <p style="margin: 0;">Выберите игрока из списка слева, чтобы просмотреть подробности.</p>
                    </div>

                </div>

            </div>

            <!-- МОДАЛКА: ДОБАВИТЬ ИГРОКА -->
            <div class="modal-overlay" v-if="showAddModal" @click.self="showAddModal = false">
                <div class="modal-body">
                    <h3>Добавить игрока</h3>
                    <form @submit.prevent="addPlayer">
                        <label>Никнейм игрока:
                            <input v-model="newPlayer.name" required placeholder="например, Zoink" />
                        </label>
                        <label>Код страны (например: ru, us, ua, kr, de):
                            <input v-model="newPlayer.country" placeholder="us" style="text-transform: lowercase;" maxLength="2" />
                        </label>
                        <label>Ссылка на аватарку (опционально):
                            <input v-model="newPlayer.avatar" placeholder="https://i.imgur.com/..." />
                        </label>
                        <label>Очки (pts):
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
                        <label>Очки за прохождение:
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
        sortedList() {
            let res = [...this.list];
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase().trim();
                res = res.filter(item => item.name && item.name.toLowerCase().includes(q));
            }
            // Сортировка по очкам от большего к меньшему
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
                // Повторный клик снимает выделение и очищает правую панель
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
                demons: []
            };

            this.list.push(obj);
            this.selectedPlayer = obj;
            this.saveData();

            this.showAddModal = false;
            this.newPlayer = { name: "", country: "", avatar: "", points: 0 };
        },

        removePlayer(playerToRemove) {
            if (confirm(`Удалить игрока "${playerToRemove.name}"?`)) {
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
                this.saveData();
            }
        },

        getPlayerRank(player) {
            return this.sortedList.findIndex(i => (i.id ? i.id === player.id : i.name === player.name)) + 1;
        }
    }
};
