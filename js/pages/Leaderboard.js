import Spinner from "../components/Spinner.js";

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="pointer-wrapper">
            <Spinner></Spinner>
        </main>

        <div v-else class="pointer-wrapper">
            <div class="pointer-layout">
                
                <!-- ЛЕВАЯ КОЛОНКА: СПИСОК ИГРОКОВ -->
                <div class="list-side">
                    <div 
                        v-for="(player, index) in filteredList" 
                        :key="player.id || player.name" 
                        class="pointer-card"
                        :class="{ 
                            'active': isSelected(player),
                            'dragging': dragIndex === index 
                        }"
                        draggable="true"
                        @dragstart="onDragStart(index, $event)"
                        @dragover.prevent="onDragOver(index)"
                        @drop="onDrop(index)"
                        @click="toggleSelectPlayer(player)"
                    >
                        <div class="drag-handle" title="Зажми ЛКМ и потяни, чтобы изменить ранг">⣿</div>
                        
                        <!-- АВАТАРКА ИГРОКА -->
                        <div class="card-thumb avatar-thumb">
                            <img :src="getAvatar(player)" @error="onImageError" alt="Player Avatar" />
                        </div>

                        <!-- ТЕКСТ КАРТОЧКИ -->
                        <div class="card-text">
                            <div class="card-title">
                                <img v-if="player.country" :src="getFlagUrl(player.country)" class="flag-icon" :title="player.country.toUpperCase()" />
                                #{{ index + 1 }} - {{ player.name }}
                            </div>
                            <div class="card-sub">Пройдено демонов: <strong>{{ player.demonsCount || 0 }}</strong></div>
                            <div class="card-pts">Всего: {{ player.points || 0 }} очков</div>
                        </div>

                        <button class="btn-delete" @click.stop="removePlayer(index)" title="Удалить игрока">✕</button>
                    </div>

                    <div v-if="list.length === 0" class="empty-msg">
                        Лидерборд пуст. Нажми «+ Добавить игрока» справа!
                    </div>
                </div>

                <!-- ПРАВАЯ КОЛОНКА: САЙДБАР И ИНФОРМАЦИЯ -->
                <div class="details-side">
                    
                    <!-- ПОИСК И ДОБАВЛЕНИЕ -->
                    <div class="side-box search-box">
                        <input 
                            type="text" 
                            v-model="searchQuery" 
                            placeholder="Поиск игрока..." 
                            class="search-input"
                        />
                        <button class="btn-primary" @click="showAddModal = true">+ Добавить игрока</button>
                    </div>

                    <!-- ИНФОРМАЦИЯ О ВЫБРАННОМ ИГРОКЕ -->
                    <div class="side-box" v-if="selectedPlayer">
                        <h2 class="level-heading">
                            <img v-if="selectedPlayer.country" :src="getFlagUrl(selectedPlayer.country)" class="flag-icon-large" />
                            #{{ getPlayerRank(selectedPlayer) }} - {{ selectedPlayer.name }}
                        </h2>
                        
                        <div class="stats-row" style="margin-top: 15px;">
                            <div><span>ОЧКИ</span> <strong>{{ selectedPlayer.points || 0 }} pts</strong></div>
                            <div><span>СТРАНА</span> <strong>{{ selectedPlayer.country ? selectedPlayer.country.toUpperCase() : 'Не указана' }}</strong></div>
                        </div>

                        <!-- СПИСОК ПРОЙДЕННЫХ ДЕМОНОВ ИГРОКА -->
                        <div class="records-section" style="margin-top: 20px;">
                            <div class="records-header">
                                <h4>Пройденные уровни</h4>
                                <button class="btn-small" @click="showAddDemonModal = true">+ Демон</button>
                            </div>
                            <ul class="records-list" v-if="selectedPlayer.demons && selectedPlayer.demons.length">
                                <li v-for="(dem, dIdx) in selectedPlayer.demons" :key="dIdx">
                                    <div class="rec-info">
                                        <strong>{{ dem.name }}</strong> ({{ dem.percent || 100 }}%) — {{ dem.points || 0 }} pts
                                    </div>
                                    <a v-if="dem.video" :href="dem.video" target="_blank" class="rec-link">Пруф ↗</a>
                                    <button class="btn-del-sm" @click="removeDemon(dIdx)">✕</button>
                                </li>
                            </ul>
                            <p v-else class="empty-text">У этого игрока пока нет зачтенных прохождений.</p>
                        </div>
                    </div>

                    <!-- ЕСЛИ НИЧЕГО НЕ ВЫБРАНО -->
                    <div class="side-box empty-msg" v-else style="text-align: center; color: #888; padding: 30px 15px;">
                        <p style="margin: 0;">Выберите игрока из списка слева, чтобы посмотреть его статистику и пройденные уровни.</p>
                    </div>

                </div>

            </div>

            <!-- МОДАЛКА: ДОБАВИТЬ ИГРОКА -->
            <div class="modal-overlay" v-if="showAddModal" @click.self="showAddModal = false">
                <div class="modal-body">
                    <h3>Добавить игрока в лидерборд</h3>
                    <form @submit.prevent="addPlayer">
                        <label>Никнейм игрока:
                            <input v-model="newPlayer.name" required placeholder="например, Zoink" />
                        </label>
                        <label>Код страны (например: ru, us, ua, kr, de, jp):
                            <input v-model="newPlayer.country" placeholder="us" style="text-transform: lowercase;" maxLength="2" />
                        </label>
                        <label>Ссылка на аватарку (опционально):
                            <input v-model="newPlayer.avatar" placeholder="https://i.imgur.com/..." />
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

            <!-- МОДАЛКА: ДОБАВИТЬ ДЕМОН ИГРОКУ -->
            <div class="modal-overlay" v-if="showAddDemonModal" @click.self="showAddDemonModal = false">
                <div class="modal-body">
                    <h3>Засчитать уровень игроку</h3>
                    <form @submit.prevent="addDemonToPlayer">
                        <label>Название уровня:
                            <input v-model="newDemon.name" required placeholder="например, Tidal Wave" />
                        </label>
                        <label>Процент (%):
                            <input type="number" v-model.number="newDemon.percent" value="100" min="1" max="100" required />
                        </label>
                        <label>Очки за прохождение:
                            <input type="number" v-model.number="newDemon.points" placeholder="350" required />
                        </label>
                        <label>Ссылка на видео доказательство:
                            <input v-model="newDemon.video" placeholder="https://youtu.be/..." />
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
        list: [],
        loading: true,
        selectedPlayer: null,
        searchQuery: "",
        dragIndex: null,
        showAddModal: false,
        showAddDemonModal: false,
        newPlayer: { name: "", country: "", avatar: "", points: 0 },
        newDemon: { name: "", percent: 100, points: 100, video: "" }
    }),

    computed: {
        filteredList() {
            if (!this.searchQuery) return this.list;
            const q = this.searchQuery.toLowerCase().trim();
            return this.list.filter(item => item.name && item.name.toLowerCase().includes(q));
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
                // Стартовые данные игроков с флагами стран
                this.list = [
                    { 
                        id: 1, 
                        name: "Zoink", 
                        country: "us",
                        avatar: "", 
                        points: 3500,
                        demonsCount: 10,
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
                        demonsCount: 8,
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
                        demonsCount: 7,
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

        /* ФУНКЦИЯ ГЕНЕРАЦИИ ССЫЛКИ НА ФЛАГ */
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

        onDragStart(index, event) {
            this.dragIndex = index;
            event.dataTransfer.effectAllowed = "move";
        },

        onDragOver(index) {
            if (this.dragIndex === null || this.dragIndex === index) return;
            const movedItem = this.list.splice(this.dragIndex, 1)[0];
            this.list.splice(index, 0, movedItem);
            this.dragIndex = index;
        },

        onDrop() {
            this.dragIndex = null;
            this.saveData();
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
            if (confirm(`Удалить игрока "${this.list[index].name}" из лидерборда?`)) {
                const player = this.list[index];
                if (this.isSelected(player)) {
                    this.selectedPlayer = null;
                }
                this.list.splice(index, 1);
                this.saveData();
            }
        },

        addDemonToPlayer() {
            if (!this.selectedPlayer) return;
            if (!this.selectedPlayer.demons) this.selectedPlayer.demons = [];

            this.selectedPlayer.demons.push({ ...this.newDemon });
            
            // Автоматически пересчитываем количество демонов и прибавляем очки
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
            return this.list.findIndex(i => (i.id ? i.id === player.id : i.name === player.name)) + 1;
        }
    }
};
