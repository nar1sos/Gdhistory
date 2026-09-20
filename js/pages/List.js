import Spinner from "../components/Spinner.js";

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="pointer-wrapper">
            <Spinner></Spinner>
        </main>

        <div v-else class="pointer-wrapper">
            <div class="pointer-layout">
                
                <!-- ЛЕВАЯ КОЛОНКА: СПИСОК УРОВНЕЙ / ИГРОКОВ -->
                <div class="list-side">
                    <div 
                        v-for="(item, index) in filteredList" 
                        :key="item.id || item.name" 
                        class="pointer-card"
                        :class="{ 
                            'active': isSelected(item),
                            'dragging': dragIndex === index 
                        }"
                        draggable="true"
                        @dragstart="onDragStart(index, $event)"
                        @dragover.prevent="onDragOver(index)"
                        @drop="onDrop(index)"
                        @click="toggleSelectItem(item)"
                    >
                        <div class="drag-handle" title="Зажми ЛКМ и потяни, чтобы изменить порядок">⣿</div>
                        
                        <!-- ПРЕВЬЮ УРОВНЯ ИЛИ АВАТАРКА -->
                        <div class="card-thumb" :class="{ 'player-avatar-thumb': item.avatar !== undefined }">
                            <img :src="getImage(item)" @error="onImageError" alt="Thumb" />
                        </div>

                        <!-- ТЕКСТ КАРТОЧКИ -->
                        <div class="card-text">
                            <div class="card-title">#{{ index + 1 }} - {{ item.name }}</div>
                            <div class="card-sub" v-if="item.author">автор: <strong>{{ item.author }}</strong></div>
                            <div class="card-sub" v-else-if="item.demons">Пройдено демонов: <strong>{{ item.demons.length }}</strong></div>
                            <div class="card-pts"><strong>{{ item.points || calculatePoints(item) }}</strong> pts</div>
                        </div>

                        <button class="btn-delete" @click.stop="removeItem(index)" title="Удалить">✕</button>
                    </div>

                    <div v-if="list.length === 0" class="empty-msg">
                        Список пуст. Нажми «+ Добавить» справа!
                    </div>
                </div>

                <!-- ПРАВАЯ КОЛОНКА: САЙДБАР -->
                <div class="details-side">
                    
                    <!-- ПОИСК И ДОБАВЛЕНИЕ -->
                    <div class="side-box search-box">
                        <input 
                            type="text" 
                            v-model="searchQuery" 
                            placeholder="Поиск..." 
                            class="search-input"
                        />
                        <button class="btn-primary" @click="showAddModal = true">+ Добавить</button>
                    </div>

                    <!-- ИНФОРМАЦИЯ О ВЫБРАННОМ ЭЛЕМЕНТЕ -->
                    <div class="side-box" v-if="selectedItem">
                        
                        <!-- ЕСЛИ ВЫБРАН ИГРОК -->
                        <template v-if="selectedItem.avatar !== undefined">
                            <div class="player-profile-header">
                                <img :src="getImage(selectedItem)" @error="onImageError" class="profile-avatar" />
                                <div>
                                    <h2 class="level-heading" style="margin: 0;">#{{ getItemRank(selectedItem) }} {{ selectedItem.name }}</h2>
                                    <button class="btn-reset" style="text-align: left; padding: 0; margin-top: 4px;" @click="editAvatar(selectedItem)">Изменить аватарку</button>
                                </div>
                            </div>
                            
                            <div class="stats-row" style="margin-bottom: 15px;">
                                <div><span>POINTS</span> <strong>{{ selectedItem.points || calculatePoints(selectedItem) }}</strong></div>
                                <div><span>DEMONS</span> <strong>{{ selectedItem.demons ? selectedItem.demons.length : 0 }}</strong></div>
                            </div>

                            <div class="records-section">
                                <div class="records-header">
                                    <h4>Пройденные уровни</h4>
                                    <button class="btn-small" @click="showAddRecordModal = true">+ Демон</button>
                                </div>
                                <ul class="records-list" v-if="selectedItem.demons && selectedItem.demons.length">
                                    <li v-for="(dem, dIdx) in selectedItem.demons" :key="dIdx">
                                        <div class="rec-info">
                                            <strong>{{ dem.name }}</strong> ({{ dem.percent || 100 }}%)
                                        </div>
                                        <button class="btn-del-sm" @click="removeRecord(dIdx)">✕</button>
                                    </li>
                                </ul>
                                <p v-else class="empty-text">Нет прикрепленных прохождений.</p>
                            </div>
                        </template>

                        <!-- ЕСЛИ ВЫБРАН УРОВЕНЬ -->
                        <template v-else>
                            <h2 class="level-heading">#{{ getItemRank(selectedItem) }} - {{ selectedItem.name }}</h2>
                            <div class="author-info">
                                <div><span>Создатель:</span> <strong>{{ selectedItem.author || 'Неизвестно' }}</strong></div>
                                <div v-if="selectedItem.verifier"><span>Верификатор:</span> <strong>{{ selectedItem.verifier }}</strong></div>
                            </div>

                            <div class="video-container" v-if="selectedItem.video">
                                <iframe 
                                    :src="getEmbedVideo(selectedItem.video)" 
                                    frameborder="0" 
                                    allowfullscreen
                                ></iframe>
                            </div>

                            <div class="stats-row">
                                <div><span>ОЧКИ</span> <strong>{{ selectedItem.points || 100 }} pts</strong></div>
                            </div>
                        </template>

                    </div>

                    <!-- ЕСЛИ НИЧЕГО НЕ ВЫБРАНО (ВЫДЕЛЕНИЕ СНЯТО) -->
                    <div class="side-box empty-msg" v-else style="text-align: center; color: #888; padding: 30px 15px;">
                        <p style="margin: 0;">Выберите элемент из списка слева, чтобы просмотреть подробности.</p>
                    </div>

                </div>

            </div>

            <!-- МОДАЛКА: ДОБАВИТЬ ЭЛЕМЕНТ -->
            <div class="modal-overlay" v-if="showAddModal" @click.self="showAddModal = false">
                <div class="modal-body">
                    <h3>Добавить карточку</h3>
                    <form @submit.prevent="addItem">
                        <label>Название / Никнейм:
                            <input v-model="newItem.name" required placeholder="например, Slaughterhouse или Zoink" />
                        </label>
                        <label>Автор / Пройдено демонов:
                            <input v-model="newItem.author" placeholder="IcEDCave или оставь пустым" />
                        </label>
                        <label>URL картинки / Превью / Аватарки:
                            <input v-model="newItem.image" placeholder="https://i.imgur.com/..." />
                        </label>
                        <label>Очки (pts):
                            <input type="number" v-model.number="newItem.points" placeholder="1000" />
                        </label>
                        <div class="modal-actions">
                            <button type="submit" class="btn-primary">Сохранить</button>
                            <button type="button" class="btn-secondary" @click="showAddModal = false">Отмена</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- МОДАЛКА: ДОБАВИТЬ РЕКОРД -->
            <div class="modal-overlay" v-if="showAddRecordModal" @click.self="showAddRecordModal = false">
                <div class="modal-body">
                    <h3>Прикрепить уровень</h3>
                    <form @submit.prevent="addRecord">
                        <label>Название уровня:
                            <input v-model="newRecord.name" required placeholder="например, Tidal Wave" />
                        </label>
                        <label>Процент прохождения (%):
                            <input type="number" v-model.number="newRecord.percent" value="100" min="1" max="100" />
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
        selectedItem: null,
        searchQuery: "",
        dragIndex: null,
        showAddModal: false,
        showAddRecordModal: false,
        newItem: { name: "", author: "", image: "", points: 0 },
        newRecord: { name: "", percent: 100 }
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
            const savedData = localStorage.getItem('pointercrate_custom_list');

            if (savedData) {
                this.list = JSON.parse(savedData);
            } else {
                this.list = [
                    { id: 1, name: "Slaughterhouse", author: "IcEDCave", image: "https://i.ytimg.com/vi/386sP_7159c/maxresdefault.jpg", points: 350, video: "https://www.youtube.com/watch?v=386sP_7159c" },
                    { id: 2, name: "Acheron", author: "Ryamu", image: "https://i.ytimg.com/vi/q4_J-sS78Lg/maxresdefault.jpg", points: 330, video: "" },
                    { id: 3, name: "Silent Clubstep", author: "Sailent", image: "https://i.ytimg.com/vi/2d_eC6B8D1U/maxresdefault.jpg", points: 310, video: "" }
                ];
            }

            // Изначально ничего не выбрано
            this.selectedItem = null;
            this.loading = false;
        },

        saveData() {
            localStorage.setItem('pointercrate_custom_list', JSON.stringify(this.list));
        },

        /* ПРОВЕРКА: ВЫБРАН ЛИ ИМЕННО ЭТОТ ЭЛЕМЕНТ В ДАННЫЙ МОМЕНТ */
        isSelected(item) {
            if (!this.selectedItem) return false;
            if (this.selectedItem.id && item.id) {
                return this.selectedItem.id === item.id;
            }
            return this.selectedItem.name === item.name;
        },

        /* СНЯТИЕ ИЛИ УСТАНОВКА ВЫДЕЛЕНИЯ */
        toggleSelectItem(item) {
            if (this.isSelected(item)) {
                // Если кликнули по УЖЕ выделенному — снимаем выделение полностью
                this.selectedItem = null;
            } else {
                // Иначе выделяем нажатый
                this.selectedItem = item;
            }
        },

        /* DRAG & DROP */
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

        /* ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ */
        getImage(item) {
            if (item.image) return item.image;
            if (item.avatar) return item.avatar;
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

        editAvatar(item) {
            const newUrl = prompt("Введите новый URL аватарки/картинки:", item.avatar || item.image || "");
            if (newUrl !== null) {
                if (item.avatar !== undefined) item.avatar = newUrl.trim();
                else item.image = newUrl.trim();
                this.saveData();
            }
        },

        addItem() {
            const obj = {
                id: Date.now(),
                name: this.newItem.name,
                author: this.newItem.author,
                image: this.newItem.image,
                points: this.newItem.points || 100
            };

            this.list.push(obj);
            this.selectedItem = obj;
            this.saveData();

            this.showAddModal = false;
            this.newItem = { name: "", author: "", image: "", points: 0 };
        },

        removeItem(index) {
            if (confirm(`Удалить "${this.list[index].name}"?`)) {
                const item = this.list[index];
                if (this.isSelected(item)) {
                    this.selectedItem = null;
                }
                this.list.splice(index, 1);
                this.saveData();
            }
        },

        addRecord() {
            if (!this.selectedItem) return;
            if (!this.selectedItem.demons) this.selectedItem.demons = [];

            this.selectedItem.demons.push({ ...this.newRecord });
            this.saveData();

            this.showAddRecordModal = false;
            this.newRecord = { name: "", percent: 100 };
        },

        removeRecord(rIdx) {
            if (this.selectedItem && this.selectedItem.demons) {
                this.selectedItem.demons.splice(rIdx, 1);
                this.saveData();
            }
        },

        getItemRank(item) {
            return this.list.findIndex(i => (i.id ? i.id === item.id : i.name === item.name)) + 1;
        },

        calculatePoints(item) {
            return item.demons ? item.demons.length * 100 : 0;
        }
    }
};
