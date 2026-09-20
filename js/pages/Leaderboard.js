import Spinner from "../components/Spinner.js";

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="pointer-wrapper">
            <Spinner></Spinner>
        </main>

        <div v-else class="pointer-wrapper">
            
            <!-- ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК: ИГРОКИ / ТОП СТРАН -->
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button 
                    class="btn-primary" 
                    :style="{ opacity: activeTab === 'players' ? 1 : 0.5 }"
                    @click="activeTab = 'players'"
                >
                    👤 Топ игроков
                </button>
                <button 
                    class="btn-primary" 
                    :style="{ opacity: activeTab === 'countries' ? 1 : 0.5 }"
                    @click="activeTab = 'countries'"
                >
                    🌐 Топ стран
                </button>
            </div>

            <!-- ВКЛАДКА 1: ТОП ИГРОКОВ (РУЧНОЙ DRAG & DROP) -->
            <div v-if="activeTab === 'players'" class="pointer-layout">
                
                <!-- ЛЕВАЯ КОЛОНКА: ЛИДЕРБОРД -->
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
                        <div class="drag-handle" title="Зажми ЛКМ и потяни, чтобы изменить место">⣿</div>
                        
                        <div class="card-thumb player-avatar-thumb">
                            <img :src="getAvatar(player)" @error="onAvatarError" alt="Avatar" />
                        </div>

                        <div class="card-text">
                            <div class="card-title">
                                <img v-if="player.country" :src="getFlagUrl(player.country)" class="flag-icon" :title="player.country.toUpperCase()" style="width: 20px; height: 14px; margin-right: 6px; vertical-align: middle; border-radius: 2px;" />
                                #{{ index + 1 }} - {{ player.name }}
                            </div>
                            <div class="card-sub">Пройдено демонов: <strong>{{ player.demons ? player.demons.length : 0 }}</strong></div>
                        </div>

                        <button class="btn-delete" @click.stop="removePlayer(index)" title="Удалить игрока">✕</button>
                    </div>

                    <div v-if="leaderboard.length === 0" class="empty-msg">
                        Лидерборд пуст. Нажми «+ Добавить игрока» справа!
                    </div>
                </div>

                <!-- ПРАВАЯ КОЛОНКА: ПОИСК, ПРОФИЛЬ ИГРОКА, АДМИНКА -->
                <div class="details-side">
                    
                    <div class="side-box search-box">
                        <input 
                            type="text" 
                            v-model="searchQuery" 
                            placeholder="Поиск игрока..." 
                            class="search-input"
                        />
                        <button class="btn-primary" @click="showAddPlayerModal = true">+ Добавить игрока</button>
                    </div>

                    <div class="side-box" v-if="selectedPlayer">
                        <div class="player-profile-header" style="display: flex; gap: 12px; align-items: center;">
                            <img :src="getAvatar(selectedPlayer)" @error="onAvatarError" class="profile-avatar" />
                            <div>
                                <h2 class="level-heading" style="margin: 0; display: flex; align-items: center; gap: 8px;">
                                    <img v-if="selectedPlayer.country" :src="getFlagUrl(selectedPlayer.country)" style="width: 24px; height: 17px; border-radius: 2px;" :title="selectedPlayer.country.toUpperCase()" />
                                    #{{ getPlayerRank(selectedPlayer) }} {{ selectedPlayer.name }}
                                </h2>
                                <div style="display: flex; gap: 10px; margin-top: 4px;">
                                    <button class="btn-reset" style="padding: 0;" @click="editAvatar(selectedPlayer)">Изменить аватарку</button>
                                    <span style="color: #555;">|</span>
                                    <button class="btn-reset" style="padding: 0;" @click="editCountry(selectedPlayer)">Изменить страну</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="stats-row" style="margin-bottom: 15px; margin-top: 15px;">
                            <div><span>ДЕМОНЫ</span> <strong>{{ selectedPlayer.demons ? selectedPlayer.demons.length : 0 }}</strong></div>
                        </div>

                        <div class="records-section">
                            <div class="records-header">
                                <h4>Пройденные уровни</h4>
                                <button class="btn-small" @click="showAddDemonModal = true">+ Демон</button>
                            </div>
                            <ul class="records-list" v-if="selectedPlayer.demons && selectedPlayer.demons.length">
                                <li v-for="(dem, dIdx) in selectedPlayer.demons" :key="dIdx" style="cursor: pointer;" title="Кликните, чтобы изменить">
                                    <div class="rec-info" @click="editDemon(dIdx)">
                                        <strong>{{ dem.name }}</strong> ({{ formatPercent(dem.percent) }})
                                    </div>
                                    <button class="btn-del-sm" @click.stop="removeDemonFromPlayer(dIdx)">✕</button>
                                </li>
                            </ul>
                            <p v-else class="empty-text">Нет прикрепленных прохождений.</p>
                        </div>
                    </div>

                </div>

            </div>

            <!-- ВКЛАДКА 2: ТОП СТРАН (С РУЧНЫМ DRAG & DROP) -->
            <div v-if="activeTab === 'countries'" class="pointer-layout">
                <div class="list-side" style="width: 100%;">
                    
                    <div style="margin-bottom: 15px;">
                        <button class="btn-primary" @click="addCountryPrompt">+ Добавить страну</button>
                    </div>

                    <div 
                        v-for="(c, index) in countriesList" 
                        :key="c.code" 
                        class="pointer-card"
                        :class="{ 'dragging': dragCountryIndex === index }"
                        draggable="true"
                        @dragstart="onCountryDragStart(index, $event)"
                        @dragover.prevent="onCountryDragOver(index)"
                        @drop="onCountryDrop(index)"
                    >
                        <div class="drag-handle" title="Зажми ЛКМ и потяни, чтобы изменить место страны">⣿</div>

                        <img 
                            :src="getFlagUrl(c.code)" 
                            style="width: 32px; height: 22px; margin-right: 12px; border-radius: 3px;" 
                        />
                        
                        <div class="card-text" style="flex: 1;">
                            <div class="card-title" style="font-size: 1.1rem;">
                                #{{ index + 1 }} - {{ c.code.toUpperCase() }}
                            </div>
                            <div class="card-sub">
                                Игроков: <strong>{{ getCountryPlayers(c.code).length }}</strong> | Всего прохождений: <strong>{{ getCountryDemonsCount(c.code) }}</strong>
                            </div>
                            <div class="card-sub" style="margin-top: 4px; color: #888;" v-if="getCountryPlayers(c.code).length">
                                Игроки: {{ getCountryPlayers(c.code).map(p => p.name).join(', ') }}
                            </div>
                        </div>

                        <button class="btn-delete" @click.stop="removeCountry(index)" title="Удалить страну из списка">✕</button>
                    </div>

                    <div v-if="countriesList.length === 0" class="empty-msg">
                        Список стран пуст. Нажми «+ Добавить страну» выше или укажи код страны в профиле игрока!
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
                        <label>Код страны (например: ru, us, ua, kr, de):
                            <input v-model="newPlayer.country" placeholder="us" style="text-transform: lowercase;" maxLength="2" />
                        </label>
                        <label>URL аватарки (картинка):
                            <input v-model="newPlayer.avatar" placeholder="https://i.imgur.com/..." />
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
                        <label>Процент прохождения (% или диапазон):
                            <input type="text" v-model="newDemon.percent" placeholder="100 или 33-100" required />
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
        activeTab: "players",
        leaderboard: [],
        countriesList: [],
        loading: true,
        selectedPlayer: null,
        searchQuery: "",
        dragIndex: null,
        dragCountryIndex: null,
        showAddPlayerModal: false,
        showAddDemonModal: false,
        newPlayer: { name: "", country: "", avatar: "" },
        newDemon: { name: "", percent: "100" }
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
            const savedCountries = localStorage.getItem('custom_countries');

            if (savedLeaderboard) {
                this.leaderboard = JSON.parse(savedLeaderboard);
            } else {
                this.leaderboard = [
                    { id: 1, name: "Твой Ник (Топ 1)", country: "ru", avatar: "", demons: [{ name: "Tidal Wave", percent: "100" }] },
                    { id: 2, name: "Zoink", country: "us", avatar: "", demons: [{ name: "Acheron", percent: "33-100" }] },
                    { id: 3, name: "Doggie", country: "us", avatar: "", demons: [{ name: "Grief", percent: "100" }] }
                ];
            }

            if (savedCountries) {
                this.countriesList = JSON.parse(savedCountries);
            } else {
                // Инициализируем список стран из уже имеющихся игроков
                this.syncCountriesFromPlayers();
            }

            if (this.leaderboard.length > 0) {
                this.selectedPlayer = this.leaderboard[0];
            }
            this.loading = false;
        },

        saveData() {
            localStorage.setItem('custom_leaderboard', JSON.stringify(this.leaderboard));
            localStorage.setItem('custom_countries', JSON.stringify(this.countriesList));
        },

        syncCountriesFromPlayers() {
            const existingCodes = new Set(this.countriesList.map(c => c.code));
            this.leaderboard.forEach(p => {
                if (p.country && !existingCodes.has(p.country.toLowerCase().trim())) {
                    const code = p.country.toLowerCase().trim();
                    this.countriesList.push({ code });
                    existingCodes.add(code);
                }
            });
        },

        getCountryPlayers(countryCode) {
            return this.leaderboard.filter(p => p.country && p.country.toLowerCase().trim() === countryCode.toLowerCase().trim());
        },

        getCountryDemonsCount(countryCode) {
            const players = this.getCountryPlayers(countryCode);
            return players.reduce((sum, p) => sum + (p.demons ? p.demons.length : 0), 0);
        },

        addCountryPrompt() {
            const code = prompt("Введите 2-буквенный код страны (например: ru, us, ua, kr, de):");
            if (code) {
                const formattedCode = code.toLowerCase().trim();
                if (!this.countriesList.some(c => c.code === formattedCode)) {
                    this.countriesList.push({ code: formattedCode });
                    this.saveData();
                }
            }
        },

        removeCountry(index) {
            if (confirm(`Удалить страну "${this.countriesList[index].code.toUpperCase()}" из списка?`)) {
                this.countriesList.splice(index, 1);
                this.saveData();
            }
        },

        formatPercent(val) {
            if (!val && val !== 0) return '100%';
            const str = String(val).trim();
            return str.endsWith('%') ? str : `${str}%`;
        },

        getFlagUrl(countryCode) {
            if (!countryCode) return '';
            const code = countryCode.toLowerCase().trim();
            return `https://flagcdn.com/24x18/${code}.png`;
        },

        editCountry(player) {
            const newCountry = prompt("Введите 2-буквенный код страны (например: ru, us, ua, kr, de):", player.country || "");
            if (newCountry !== null) {
                player.country = newCountry.toLowerCase().trim();
                this.syncCountriesFromPlayers();
                this.saveData();
            }
        },

        /* DRAG & DROP ДЛЯ ИГРОКОВ */
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

        /* DRAG & DROP ДЛЯ СТРАН */
        onCountryDragStart(index, event) {
            this.dragCountryIndex = index;
            event.dataTransfer.effectAllowed = "move";
        },

        onCountryDragOver(index) {
            if (this.dragCountryIndex === null || this.dragCountryIndex === index) return;
            const movedCountry = this.countriesList.splice(this.dragCountryIndex, 1)[0];
            this.countriesList.splice(index, 0, movedCountry);
            this.dragCountryIndex = index;
        },

        onCountryDrop() {
            this.dragCountryIndex = null;
            this.saveData();
        },

        /* ИГРОКИ И АВАТАРКИ */
        addPlayer() {
            const countryCode = this.newPlayer.country ? this.newPlayer.country.toLowerCase().trim() : "";
            const playerObj = {
                id: Date.now(),
                name: this.newPlayer.name,
                country: countryCode,
                avatar: this.newPlayer.avatar,
                demons: []
            };

            this.leaderboard.push(playerObj);
            this.selectedPlayer = playerObj;
            
            this.syncCountriesFromPlayers();
            this.saveData();

            this.showAddPlayerModal = false;
            this.newPlayer = { name: "", country: "", avatar: "" };
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

            this.selectedPlayer.demons.push({
                name: this.newDemon.name,
                percent: this.newDemon.percent || "100"
            });
            this.saveData();

            this.showAddDemonModal = false;
            this.newDemon = { name: "", percent: "100" };
        },

        editDemon(dIdx) {
            if (!this.selectedPlayer || !this.selectedPlayer.demons[dIdx]) return;
            const demon = this.selectedPlayer.demons[dIdx];
            
            const newPercent = prompt(`Введите новый процент или диапазон для "${demon.name}" (например: 100 или 33-100):`, demon.percent || "100");
            if (newPercent !== null) {
                demon.percent = newPercent.trim();
                this.saveData();
            }
        },

        removeDemonFromPlayer(dIdx) {
            if (this.selectedPlayer && this.selectedPlayer.demons) {
                this.selectedPlayer.demons.splice(dIdx, 1);
                this.saveData();
            }
        },

        getPlayerRank(player) {
            return this.leaderboard.findIndex(p => p === player) + 1;
        }
    }
};
