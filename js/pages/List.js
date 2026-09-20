import Spinner from "../components/Spinner.js";

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="pointer-wrapper">
            <Spinner></Spinner>
        </main>

        <div v-else class="pointer-wrapper">
            <div class="pointer-layout">
                
                <!-- ЛЕВАЯ КОЛОНКА: СПИСОК УРОВНЕЙ С DRAG & DROP -->
                <div class="list-side">
                    <div 
                        v-for="(level, index) in list" 
                        :key="level.id || level.name" 
                        class="pointer-card"
                        :class="{ 
                            'active': selectedLevel?.name === level.name,
                            'dragging': dragIndex === index 
                        }"
                        draggable="true"
                        @dragstart="onDragStart(index, $event)"
                        @dragover.prevent="onDragOver(index)"
                        @drop="onDrop(index)"
                        @click="selectedLevel = level"
                    >
                        <div class="drag-handle" title="Зажми ЛКМ и потяни, чтобы изменить позицию">⣿</div>
                        
                        <div class="card-thumb">
                            <img :src="getThumbnail(level)" @error="onThumbError" />
                        </div>
                        
                        <div class="card-text">
                            <div class="card-title">#{{ index + 1 }} - {{ level.name }}</div>
                            <div class="card-sub">от <strong>{{ level.author }}</strong> (вер. {{ level.verifier }})</div>
                            <div class="card-pts">{{ score(index + 1) }} pts — {{ level.percentToQualify || 100 }}% или выше</div>
                        </div>

                        <button class="btn-delete" @click.stop="removeLevel(index)" title="Удалить уровень">✕</button>
                    </div>

                    <div v-if="list.length === 0" class="empty-msg">
                        Список уровней пуст. Нажми «Добавить уровень» справа!
                    </div>
                </div>

                <!-- ПРАВАЯ КОЛОНКА: ПОИСК, ВИДЕО, АДМИНКА, МОДЕРАТОРЫ, ПРАВИЛА -->
                <div class="details-side">
                    
                    <!-- ПОИСК И КНОПКА СОЗДАНИЯ -->
                    <div class="side-box search-box">
                        <input 
                            type="text" 
                            v-model="searchQuery" 
                            placeholder="Поиск уровней..." 
                            class="search-input"
                        />
                        <button class="btn-primary" @click="showAddModal = true">+ Добавить уровень</button>
                    </div>

                    <!-- ИНФОРМАЦИЯ О ВЫБРАННОМ УРОВНЕ И РЕКОРДЫ -->
                    <div class="side-box" v-if="selectedLevel">
                        <h2 class="level-heading">#{{ getLevelRank(selectedLevel) }} {{ selectedLevel.name }}</h2>
                        <div class="author-info">
                            <div><span>CREATOR</span> <strong>{{ selectedLevel.author }}</strong></div>
                            <div><span>VERIFIER</span> <strong>{{ selectedLevel.verifier }}</strong></div>
                        </div>

                        <div class="video-container" v-if="selectedLevel.ytid">
                            <iframe 
                                :src="embed(selectedLevel.ytid)" 
                                frameborder="0" 
                                allowfullscreen
                            ></iframe>
                        </div>

                        <div class="stats-row">
                            <div><span>POINTS</span> <strong>{{ score(getLevelRank(selectedLevel)) }}</strong></div>
                            <div><span>QUALIFY</span> <strong>{{ selectedLevel.percentToQualify || 100 }}%</strong></div>
                        </div>

                        <!-- РЕКОРДЫ ИГРОКОВ -->
                        <div class="records-section">
                            <div class="records-header">
                                <h4>Прохождения ({{ selectedLevel.records ? selectedLevel.records.length : 0 }})</h4>
                                <button class="btn-small" @click="showRecordModal = true">+ Рекорд</button>
                            </div>
                            <ul class="records-list" v-if="selectedLevel.records && selectedLevel.records.length">
                                <li v-for="(rec, rIdx) in selectedLevel.records" :key="rIdx">
                                    <div class="rec-info">
                                        <strong>{{ rec.user }}</strong> — {{ rec.percent }}% ({{ rec.hz }}Hz)
                                    </div>
                                    <a v-if="rec.link" :href="rec.link" target="_blank" class="rec-link">Видео</a>
                                    <button class="btn-del-sm" @click="removeRecord(rIdx)">✕</button>
                                </li>
                            </ul>
                            <p v-else class="empty-text">Пока нет подтвержденных рекордов.</p>
                        </div>
                    </div>

                    <!-- МОДЕРАТОРЫ ЛИСТА -->
                    <div class="side-box">
                        <div class="mod-header">
                            <h3>Модераторы листа</h3>
                            <button class="btn-small" @click="addModerator">+ Добавить</button>
                        </div>
                        <ul class="simple-list" v-if="editors.length">
                            <li v-for="(editor, i) in editors" :key="i" class="mod-item">
                                <span>{{ editor }}</span>
                                <button class="btn-del-sm" @click="removeModerator(i)">✕</button>
                            </li>
                        </ul>
                    </div>

                    <!-- ПРАВИЛА -->
                    <div class="side-box">
                        <h3>Правила листа</h3>
                        <ol class="rules-list">
                            <li>Запись должна быть с оригинальными кликами/тапами.</li>
                            <li>Читы и секрет-веи строго запрещены.</li>
                            <li>Все изменения топа сохраняются у вас локально.</li>
                        </ol>
                        <button class="btn-reset" @click="resetToDefault">Сбросить всё к дефолту</button>
                    </div>

                </div>

            </div>

            <!-- МОДАЛЬНОЕ ОКНО: ДОБАВЛЕНИЕ УРОВНЯ -->
            <div class="modal-overlay" v-if="showAddModal" @click.self="showAddModal = false">
                <div class="modal-body">
                    <h3>Добавить новый уровень в Топ</h3>
                    <form @submit.prevent="addLevel">
                        <label>Название уровня:
                            <input v-model="newLevel.name" required placeholder="например, Tidal Wave" />
                        </label>
                        <label>Создатель (Creator):
                            <input v-model="newLevel.author" required placeholder="Onilink" />
                        </label>
                        <label>Верификатор (Verifier):
                            <input v-model="newLevel.verifier" required placeholder="Doggie" />
                        </label>
                        <label>YouTube Video ID или ссылка:
                            <input v-model="newLevel.ytid" required placeholder="например, d95jE1v434s" />
                        </label>
                        <label>URL кастомной картинки (необязательно):
                            <input v-model="newLevel.customThumb" placeholder="https://..." />
                        </label>
                        <label>% для квалификации:
                            <input type="number" v-model.number="newLevel.percentToQualify" value="100" />
                        </label>
                        <div class="modal-actions">
                            <button type="submit" class="btn-primary">Сохранить</button>
                            <button type="button" class="btn-secondary" @click="showAddModal = false">Отмена</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- МОДАЛЬНОЕ ОКНО: ДОБАВЛЕНИЕ РЕКОРДА ИГРОКА -->
            <div class="modal-overlay" v-if="showRecordModal" @click.self="showRecordModal = false">
                <div class="modal-body">
                    <h3>Добавить рекорд игрока</h3>
                    <form @submit.prevent="addRecord">
                        <label>Никнейм игрока:
                            <input v-model="newRecord.user" required placeholder="Игрок" />
                        </label>
                        <label>Процент прохождения (%):
                            <input type="number" v-model.number="newRecord.percent" required min="1" max="100" />
                        </label>
                        <label>Герцовка (Hz):
                            <input type="number" v-model.number="newRecord.hz" value="360" />
                        </label>
                        <label>Ссылка на видео доказательство:
                            <input v-model="newRecord.link" placeholder="https://youtube.com/..." />
                        </label>
                        <div class="modal-actions">
                            <button type="submit" class="btn-primary">Добавить рекорд</button>
                            <button type="button" class="btn-secondary" @click="showRecordModal = false">Отмена</button>
                        </div>
                    </form>
                </div>
            </div>

        </div>
    `,

    data: () => ({
        list: [],
        editors: [],
        loading: true,
        selectedLevel: null,
        searchQuery: "",
        dragIndex: null,
        showAddModal: false,
        showRecordModal: false,
        newLevel: {
            name: "",
            author: "",
            verifier: "",
            ytid: "",
            customThumb: "",
            percentToQualify: 100
        },
        newRecord: {
            user: "",
            percent: 100,
            hz: 360,
            link: ""
        }
    }),

    mounted() {
        this.loadData();
    },

    methods: {
        loadData() {
            // Загрузка из localStorage или дефолтные значения
            const savedList = localStorage.getItem('custom_demon_list');
            const savedEditors = localStorage.getItem('custom_editors_list');

            if (savedList) {
                this.list = JSON.parse(savedList);
            } else {
                // Стартовый демо-список
                this.list = [
                    { id: 1, name: "Tidal Wave", author: "Onilink", verifier: "Doggie", ytid: "d95jE1v434s", percentToQualify: 100, records: [] },
                    { id: 2, name: "Acheron", author: "Ryamu", verifier: "Zoink", ytid: "3547192841", percentToQualify: 100, records: [] }
                ];
            }

            if (savedEditors) {
                this.editors = JSON.parse(savedEditors);
            } else {
                this.editors = ["Главный Модератор", "Твой Ник"];
            }

            if (this.list.length > 0) {
                this.selectedLevel = this.list[0];
            }
            this.loading = false;
        },

        saveData() {
            localStorage.setItem('custom_demon_list', JSON.stringify(this.list));
            localStorage.setItem('custom_editors_list', JSON.stringify(this.editors));
        },

        /* DRAG & DROP РЕАЛИЗАЦИЯ */
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

        /* УПРАВЛЕНИЕ УРОВНЯМИ */
        addLevel() {
            let extractedYtid = this.newLevel.ytid;
            if (extractedYtid.includes('v=')) {
                extractedYtid = extractedYtid.split('v=')[1].split('&')[0];
            } else if (extractedYtid.includes('youtu.be/')) {
                extractedYtid = extractedYtid.split('youtu.be/')[1].split('?')[0];
            }

            const levelObj = {
                id: Date.now(),
                name: this.newLevel.name,
                author: this.newLevel.author,
                verifier: this.newLevel.verifier,
                ytid: extractedYtid,
                customThumb: this.newLevel.customThumb,
                percentToQualify: this.newLevel.percentToQualify || 100,
                records: []
            };

            this.list.push(levelObj);
            this.selectedLevel = levelObj;
            this.saveData();

            this.showAddModal = false;
            this.newLevel = { name: "", author: "", verifier: "", ytid: "", customThumb: "", percentToQualify: 100 };
        },

        removeLevel(index) {
            if (confirm(`Удалить уровень "${this.list[index].name}" из топа?`)) {
                const isSelected = this.selectedLevel === this.list[index];
                this.list.splice(index, 1);
                if (isSelected) {
                    this.selectedLevel = this.list[0] || null;
                }
                this.saveData();
            }
        },

        /* УПРАВЛЕНИЕ РЕКОРДАМИ */
        addRecord() {
            if (!this.selectedLevel) return;
            if (!this.selectedLevel.records) this.selectedLevel.records = [];

            this.selectedLevel.records.push({ ...this.newRecord });
            this.saveData();

            this.showRecordModal = false;
            this.newRecord = { user: "", percent: 100, hz: 360, link: "" };
        },

        removeRecord(rIdx) {
            if (this.selectedLevel && this.selectedLevel.records) {
                this.selectedLevel.records.splice(rIdx, 1);
                this.saveData();
            }
        },

        /* УПРАВЛЕНИЕ МОДЕРАТОРАМИ */
        addModerator() {
            const name = prompt("Введите имя нового модератора:");
            if (name && name.trim()) {
                this.editors.push(name.trim());
                this.saveData();
            }
        },

        removeModerator(index) {
            this.editors.splice(index, 1);
            this.saveData();
        },

        resetToDefault() {
            if (confirm("Вы уверены, что хотите сбросить весь список к начальному виду? Все добавленные уровни удалятся.")) {
                localStorage.removeItem('custom_demon_list');
                localStorage.removeItem('custom_editors_list');
                this.loadData();
            }
        },

        /* ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ */
        getLevelRank(level) {
            return this.list.findIndex(l => l === level) + 1;
        },

        embed(ytid) {
            return ytid ? `https://www.youtube.com/embed/${ytid}` : '';
        },

        getThumbnail(level) {
            if (level.customThumb) return level.customThumb;
            if (level.ytid) return `https://i.ytimg.com/vi/${level.ytid}/hqdefault.jpg`;
            return 'https://i.imgur.com/6VBx3io.png';
        },

        onThumbError(e) {
            e.target.src = 'https://i.imgur.com/6VBx3io.png';
        },

        score(rank) {
            if (!rank || rank < 1) return 0;
            return Math.max(100 - (rank - 1) * 2, 5);
        }
    }
};
