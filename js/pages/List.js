import Spinner from "../components/Spinner.js";

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="pointer-wrapper">
            <Spinner></Spinner>
        </main>

        <div v-else class="pointer-wrapper">
            <div class="pointer-layout">
                
                <!-- ЛЕВАЯ КОЛОНКА: СПИСОК УРОВНЕЙ -->
                <div class="list-side">
                    <div 
                        v-for="(level, index) in filteredList" 
                        :key="level.id || level.name" 
                        class="pointer-card"
                        :class="{ 
                            'active': isSelected(level),
                            'dragging': dragIndex === index 
                        }"
                        draggable="true"
                        @dragstart="onDragStart(index, $event)"
                        @dragover.prevent="onDragOver(index)"
                        @drop="onDrop(index)"
                        @click="toggleSelectLevel(level)"
                    >
                        <div class="drag-handle" title="Зажми ЛКМ и потяни, чтобы изменить порядок">⣿</div>
                        
                        <!-- ПРЕВЬЮ УРОВНЯ (16:9) -->
                        <div class="card-thumb">
                            <img :src="getImage(level)" @error="onImageError" alt="Level Preview" />
                        </div>

                        <!-- ТЕКСТ КАРТОЧКИ -->
                        <div class="card-text">
                            <div class="card-title">#{{ index + 1 }} - {{ level.name }}</div>
                            <div class="card-sub">опубликован <strong>{{ level.author || 'Неизвестно' }}</strong></div>
                            <div class="card-pts">100% — {{ level.points || 100 }} очков</div>
                        </div>

                        <button class="btn-delete" @click.stop="removeLevel(index)" title="Удалить уровень">✕</button>
                    </div>

                    <div v-if="list.length === 0" class="empty-msg">
                        Демонлист пуст. Нажми «+ Добавить уровень» справа!
                    </div>
                </div>

                <!-- ПРАВАЯ КОЛОНКА: САЙДБАР И ИНФОРМАЦИЯ -->
                <div class="details-side">
                    
                    <!-- ПОИСК И ДОБАВЛЕНИЕ -->
                    <div class="side-box search-box">
                        <input 
                            type="text" 
                            v-model="searchQuery" 
                            placeholder="Поиск уровня..." 
                            class="search-input"
                        />
                        <button class="btn-primary" @click="showAddModal = true">+ Добавить уровень</button>
                    </div>

                    <!-- ИНФОРМАЦИЯ О ВЫБРАННОМ УРОВНЕ -->
                    <div class="side-box" v-if="selectedLevel">
                        <h2 class="level-heading">#{{ getLevelRank(selectedLevel) }} - {{ selectedLevel.name }}</h2>
                        
                        <div class="author-info">
                            <div><span>Создатель:</span> <strong>{{ selectedLevel.author || 'Неизвестно' }}</strong></div>
                            <div><span>Верификатор:</span> <strong>{{ selectedLevel.verifier || 'Неизвестно' }}</strong></div>
                        </div>

                        <!-- ВИДЕО ВЕРИФИКАЦИИ -->
                        <div class="video-container" v-if="selectedLevel.video">
                            <iframe 
                                :src="getEmbedVideo(selectedLevel.video)" 
                                frameborder="0" 
                                allowfullscreen
                            ></iframe>
                        </div>

                        <div class="stats-row">
                            <div><span>ОЧКИ</span> <strong>{{ selectedLevel.points || 100 }} pts</strong></div>
                        </div>

                        <!-- РЕКОРДЫ / ПРОХОЖДЕНИЯ ИГРОКОВ -->
                        <div class="records-section">
                            <div class="records-header">
                                <h4>Рекорды уровня</h4>
                                <button class="btn-small" @click="showAddRecordModal = true">+ Рекорд</button>
                            </div>
                            <ul class="records-list" v-if="selectedLevel.records && selectedLevel.records.length">
                                <li v-for="(rec, rIdx) in selectedLevel.records" :key="rIdx">
                                    <div class="rec-info">
                                        <strong>{{ rec.player }}</strong> ({{ rec.percent }}%)
                                    </div>
                                    <a v-if="rec.video" :href="rec.video" target="_blank" class="rec-link">Пруф ↗</a>
                                    <button class="btn-del-sm" @click="removeRecord(rIdx)">✕</button>
                                </li>
                            </ul>
                            <p v-else class="empty-text">Пока нет подтвержденных рекордов.</p>
                        </div>
                    </div>

                    <!-- ЕСЛИ НИЧЕГО НЕ ВЫБРАНО (ВЫДЕЛЕНИЕ СНЯТО) -->
                    <div class="side-box empty-msg" v-else style="text-align: center; color: #888; padding: 30px 15px;">
                        <p style="margin: 0;">Выберите уровень из списка слева, чтобы посмотреть видео, верификатора и рекорды.</p>
                    </div>

                </div>

            </div>

            <!-- МОДАЛКА: ДОБАВИТЬ УРО ВЕНЬ -->
            <div class="modal-overlay" v-if="showAddModal" @click.self="showAddModal = false">
                <div class="modal-body">
                    <h3>Добавить уровень</h3>
                    <form @submit.prevent="addLevel">
                        <label>Название уровня:
                            <input v-model="newLevel.name" required placeholder="например, Slaughterhouse" />
                        </label>
                        <label>Создатель (Author):
                            <input v-model="newLevel.author" required placeholder="например, IcEDCave" />
                        </label>
                        <label>Верификатор (Verifier):
                            <input v-model="newLevel.verifier" placeholder="например, Doggie" />
                        </label>
                        <label>Ссылка на картинку / Превью:
                            <input v-model="newLevel.image" placeholder="https://i.ytimg.com/vi/..." />
                        </label>
                        <label>Ссылка на видео YouTube:
                            <input v-model="newLevel.video" placeholder="https://www.youtube.com/watch?v=..." />
                        </label>
                        <label>Очки за 100%:
                            <input type="number" v-model.number="newLevel.points" placeholder="350" />
                        </label>
                        <div class="modal-actions">
                            <button type="submit" class="btn-primary">Сохранить</button>
                            <button type="button" class="btn-secondary" @click="showAddModal = false">Отмена</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- МОДАЛКА: ДОБАВИТЬ РЕКОРД ИГРОКА -->
            <div class="modal-overlay" v-if="showAddRecordModal" @click.self="showAddRecordModal = false">
                <div class="modal-body">
                    <h3>Добавить рекорд игрока</h3>
                    <form @submit.prevent="addRecord">
                        <label>Никнейм игрока:
                            <input v-model="newRecord.player" required placeholder="например, Zoink" />
                        </label>
                        <label>Процент прохождения (%):
                            <input type="number" v-model.number="newRecord.percent" value="100" min="1" max="100" required />
                        </label>
                        <label>Ссылка на видео доказательство:
                            <input v-model="newRecord.video" placeholder="https://youtu.be/..." />
                        </label>
                        <div class="modal-actions">
                            <button type="submit" class="btn-primary">Прикрепить</button>
                            <button type="button" class="btn-secondary" @click="showAddRecordModal = false">Отмена</button>
                        </div>
                    </form>
                </div>
            </div>

        </div>
    `,

    data: () => ({
        list: [],
        loading: true,
        selectedLevel: null,
        searchQuery: "",
        dragIndex: null,
        showAddModal: false,
        showAddRecordModal: false,
        newLevel: { name: "", author: "", verifier: "", image: "", video: "", points: 350 },
        newRecord: { player: "", percent: 100, video: "" }
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
            const savedData = localStorage.getItem('pointercrate_demonlist');

            if (savedData) {
                this.list = JSON.parse(savedData);
            } else {
                // Стандартные демоны по умолчанию
                this.list = [
                    { 
                        id: 1, 
                        name: "Slaughterhouse", 
                        author: "IcEDCave", 
                        verifier: "Doggie",
                        image: "https://i.ytimg.com/vi/386sP_7159c/maxresdefault.jpg", 
                        video: "https://www.youtube.com/watch?v=386sP_7159c",
                        points: 350,
                        records: [
                            { player: "Zoink", percent: 100, video: "https://youtu.be/..." }
                        ]
                    },
                    { 
                        id: 2, 
                        name: "Acheron", 
                        author: "Ryamu", 
                        verifier: "Trick",
                        image: "https://i.ytimg.com/vi/q4_J-sS78Lg/maxresdefault.jpg", 
                        video: "https://www.youtube.com/watch?v=q4_J-sS78Lg",
                        points: 330,
                        records: []
                    }
                ];
            }

            // При запуске ничего не выделяем
            this.selectedLevel = null;
            this.loading = false;
        },

        saveData() {
            localStorage.setItem('pointercrate_demonlist', JSON.stringify(this.list));
        },

        /* ПРОВЕРКА: ВЫБРАН ЛИ ИМЕННО ЭТОТ УРОВЕНЬ */
        isSelected(level) {
            if (!this.selectedLevel) return false;
            return this.selectedLevel.id ? (this.selectedLevel.id === level.id) : (this.selectedLevel.name === level.name);
        },

        /* КЛИК ПО КАРТОЧКЕ: ВЫБРАТЬ / СНЯТЬ ВЫДЕЛЕНИЕ */
        toggleSelectLevel(level) {
            if (this.isSelected(level)) {
                // Если повторно нажимаем на этот же уровень — снимаем выбор!
                this.selectedLevel = null;
            } else {
                // Выбираем новый
                this.selectedLevel = level;
            }
        },

        /* DRAG & DROP ПЕРЕТАСКИВАНИЕ */
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

        /* ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ */
        getImage(level) {
            if (level.image) return level.image;
            return 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
        },

        onImageError(e) {
            e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
        },

        getEmbedVideo(url) {
            if (!url) return '';
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const match = url.match(regExp);
            return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url;
        },

        addLevel() {
            const obj = {
                id: Date.now(),
                name: this.newLevel.name,
                author: this.newLevel.author,
                verifier: this.newLevel.verifier,
                image: this.newLevel.image,
                video: this.newLevel.video,
                points: this.newLevel.points || 100,
                records: []
            };

            this.list.push(obj);
            this.selectedLevel = obj;
            this.saveData();

            this.showAddModal = false;
            this.newLevel = { name: "", author: "", verifier: "", image: "", video: "", points: 350 };
        },

        removeLevel(index) {
            if (confirm(`Удалить уровень "${this.list[index].name}" из списка?`)) {
                const level = this.list[index];
                if (this.isSelected(level)) {
                    this.selectedLevel = null;
                }
                this.list.splice(index, 1);
                this.saveData();
            }
        },

        addRecord() {
            if (!this.selectedLevel) return;
            if (!this.selectedLevel.records) this.selectedLevel.records = [];

            this.selectedLevel.records.push({ ...this.newRecord });
            this.saveData();

            this.showAddRecordModal = false;
            this.newRecord = { player: "", percent: 100, video: "" };
        },

        removeRecord(rIdx) {
            if (this.selectedLevel && this.selectedLevel.records) {
                this.selectedLevel.records.splice(rIdx, 1);
                this.saveData();
            }
        },

        getLevelRank(level) {
            return this.list.findIndex(i => (i.id ? i.id === level.id : i.name === level.name)) + 1;
        }
    }
};
