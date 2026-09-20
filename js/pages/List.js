import * as ContentModule from "../content.js";
import Spinner from "../components/Spinner.js";

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="gdl-wrapper">
            <Spinner></Spinner>
        </main>

        <div v-else class="gdl-wrapper">
            <!-- ДВЕ КОЛОНКИ (1 В 1 КАК НА POINTERCRATE) -->
            <div class="gdl-content-grid">
                
                <!-- ЛЕВАЯ КОЛОНКА (СПИСОК УРОВНЕЙ) -->
                <div class="gdl-left-column">
                    <div class="gdl-cards-container">
                        <div 
                            v-for="level in filteredList" 
                            :key="level.path || level.rank" 
                            class="gdl-level-card"
                            :class="{ 'active': selectedLevel?.name === level.name }"
                            @click="selectedLevel = level"
                        >
                            <div class="gdl-card-thumb">
                                <img :src="getThumbnail(level.ytid)" @error="onThumbError" />
                            </div>
                            <div class="gdl-card-info">
                                <div class="card-header">
                                    <h3 class="level-title">#{{ level.rank }} - {{ level.name }}</h3>
                                </div>
                                <div class="card-authors">
                                    опубликован <strong>{{ level.author }}</strong>
                                </div>
                                <div class="card-points">
                                    <span>{{ score(level.rank) }} pts</span> — {{ level.percentToQualify || 100 }}% или выше
                                </div>
                            </div>
                        </div>
                        <div v-if="filteredList.length === 0" style="color: #64748b; text-align: center; padding: 20px;">
                            Уровень не найден.
                        </div>
                    </div>
                </div>

                <!-- ПРАВАЯ КОЛОНКА (ИНФО, МОДЕРАТОРЫ, ПРАВИЛА, ПОИСК) -->
                <div class="gdl-right-column">
                    
                    <!-- ПОИСК СРАЗУ СВЕРХУ -->
                    <div class="gdl-search-bar">
                        <div class="search-input-wrapper">
                            <input 
                                type="text" 
                                v-model="searchQuery" 
                                placeholder="Поиск уровней..." 
                                class="gdl-input"
                            />
                            <button v-if="searchQuery" @click="searchQuery = ''" class="clear-btn">✕</button>
                        </div>
                    </div>

                    <!-- ДЕТАЛИ И ВИДЕО УРОВНЯ -->
                    <div class="gdl-details-container" v-if="selectedLevel">
                        <div class="gdl-level-detail-box">
                            <h2 class="detail-title">#{{ selectedLevel.rank }} {{ selectedLevel.name }}</h2>

                            <div class="authors-clean-block">
                                <div class="author-item">
                                    <span class="author-label">CREATOR</span>
                                    <span class="author-val">{{ selectedLevel.author }}</span>
                                </div>
                                <div class="author-item">
                                    <span class="author-label">VERIFIER</span>
                                    <span class="author-val verifier-name">{{ selectedLevel.verifier }}</span>
                                </div>
                            </div>

                            <!-- ВИДЕО -->
                            <div class="video-wrapper" v-if="selectedLevel.ytid">
                                <iframe 
                                    :src="embed(selectedLevel.ytid)" 
                                    frameborder="0" 
                                    allowfullscreen
                                ></iframe>
                            </div>

                            <!-- СТАТИСТИКА -->
                            <div class="gdl-stats-grid">
                                <div class="stat-item">
                                    <span class="stat-label">POINTS</span>
                                    <span class="stat-value">{{ score(selectedLevel.rank) }}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">QUALIFY</span>
                                    <span class="stat-value">{{ selectedLevel.percentToQualify || 100 }}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- МОДЕРАТОРЫ -->
                    <div class="gdl-meta-box">
                        <h3>Модераторы листа</h3>
                        <ul class="editors-list" v-if="editors.length">
                            <li v-for="(editor, i) in editors" :key="i">
                                <span>{{ editor.name || editor }}</span>
                            </li>
                        </ul>
                        <p v-else style="color: #64748b; font-size: 13px;">Нет модераторов.</p>
                    </div>

                    <!-- ПРАВИЛА -->
                    <div class="gdl-meta-box rules-section">
                        <h3>Правила</h3>
                        <ul class="rules-list">
                            <li><strong>1.</strong> Records must have video proof with clicks/taps.</li>
                            <li><strong>2.</strong> Raw footage must be available if requested.</li>
                            <li><strong>3.</strong> Hacks or secret ways are strictly prohibited.</li>
                        </ul>
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
