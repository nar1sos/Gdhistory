import * as ContentModule from "../content.js";
import Spinner from "../components/Spinner.js";

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="pointer-wrapper">
            <Spinner></Spinner>
        </main>

        <div v-else class="pointer-wrapper">
            <!-- ДВЕ ОСНОВНЫЕ КОЛОНКИ -->
            <div class="pointer-layout">
                
                <!-- ЛЕВАЯ КОЛОНКА: ТОЛЬКО СПИСОК УРОВНЕЙ -->
                <div class="list-side">
                    <div 
                        v-for="level in filteredList" 
                        :key="level.path || level.rank" 
                        class="pointer-card"
                        :class="{ 'active': selectedLevel?.name === level.name }"
                        @click="selectedLevel = level"
                    >
                        <div class="card-thumb">
                            <img :src="getThumbnail(level.ytid)" @error="onThumbError" />
                        </div>
                        <div class="card-text">
                            <div class="card-title">#{{ level.rank }} - {{ level.name }}</div>
                            <div class="card-sub">опубликован <strong>{{ level.author }}</strong></div>
                            <div class="card-pts">{{ score(level.rank) }} pts — {{ level.percentToQualify || 100 }}% или выше</div>
                        </div>
                    </div>
                    <div v-if="filteredList.length === 0" class="empty-msg">
                        Уровни не найдены.
                    </div>
                </div>

                <!-- ПРАВАЯ КОЛОНКА: ИНФОРМАЦИЯ, ПОИСК, МОДЕРАТОРЫ, ПРАВИЛА -->
                <div class="details-side">
                    
                    <!-- 1. ПОИСК -->
                    <div class="side-box search-box">
                        <input 
                            type="text" 
                            v-model="searchQuery" 
                            placeholder="Поиск уровней..." 
                            class="search-input"
                        />
                    </div>

                    <!-- 2. ИНФО О ВЫБРАННОМ УРОВНЕ И ВИДЕО -->
                    <div class="side-box" v-if="selectedLevel">
                        <h2 class="level-heading">#{{ selectedLevel.rank }} {{ selectedLevel.name }}</h2>
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
                            <div><span>POINTS</span> <strong>{{ score(selectedLevel.rank) }}</strong></div>
                            <div><span>QUALIFY</span> <strong>{{ selectedLevel.percentToQualify || 100 }}%</strong></div>
                        </div>
                    </div>

                    <!-- 3. МОДЕРАТОРЫ -->
                    <div class="side-box">
                        <h3>Модераторы листа</h3>
                        <ul class="simple-list" v-if="editors.length">
                            <li v-for="(editor, i) in editors" :key="i">
                                {{ editor.name || editor }}
                            </li>
                        </ul>
                        <p v-else class="empty-text">Нет модераторов.</p>
                    </div>

                    <!-- 4. ПРАВИЛА -->
                    <div class="side-box">
                        <h3>Правила</h3>
                        <ol class="rules-list">
                            <li>Records must have video proof with clicks/taps.</li>
                            <li>Raw footage must be available if requested.</li>
                            <li>Hacks or secret ways are strictly prohibited.</li>
                        </ol>
                    </div>

                </div>

            </div>
        </div>
    `,

    data: () => ({
        list: [],
        editors: [],
        loading: true,
        selectedLevel: null,
        searchQuery: ""
    }),

    computed: {
        filteredList() {
            if (!this.searchQuery) return this.list;
            const q = this.searchQuery.toLowerCase().trim();
            return this.list.filter(l => 
                (l.name && l.name.toLowerCase().includes(q)) ||
                (l.author && l.author.toLowerCase().includes(q)) ||
                (l.verifier && l.verifier.toLowerCase().includes(q))
            );
        },
        recordsList() {
            if (!this.selectedLevel || !this.selectedLevel.records) return [];
            return Array.isArray(this.selectedLevel.records) ? this.selectedLevel.records : [];
        }
    },

    async mounted() {
        try {
            const fetchListFn = ContentModule.fetchList || (async () => []);
            const fetchEditorsFn = ContentModule.fetchEditors || (async () => []);

            const [listData, editorsData] = await Promise.all([
                fetchListFn(),
                fetchEditorsFn()
            ]);

            this.list = Array.isArray(listData) ? listData : [];
            this.editors = Array.isArray(editorsData) ? editorsData : [];

            if (this.list.length > 0) {
                this.selectedLevel = this.list[0];
            }
        } catch (e) {
            console.error("Error mounting List component:", e);
        } finally {
            this.loading = false;
        }
    },

    methods: {
        embed(ytid) {
            if (!ytid) return '';
            return `https://www.youtube.com/embed/${ytid}`;
        },

        getThumbnail(ytid) {
            if (!ytid) {
                return 'https://img.youtube.com/vi/3547192841/hqdefault.jpg';
            }
            return `https://i.ytimg.com/vi/${ytid}/hqdefault.jpg`;
        },

        onThumbError(e) {
            e.target.src = 'https://i.imgur.com/6VBx3io.png';
        },

        score(rank) {
            if (!rank || typeof rank !== 'number') return 0;
            return Math.max(100 - (rank - 1) * 2, 5);
        }
    }
};
