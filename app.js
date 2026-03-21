// ===== Facebook Comments Extractor - App Logic =====

(function () {
    'use strict';

    // ===== State =====
    const state = {
        accessToken: '',
        pages: [],
        selectedPage: null,
        videos: [],       // [{id, name}]
        results: {},      // { videoId: { name, comments: [{userName, userId, message, time}] } }
        totals: {},       // { userId: {name, count} }
    };

    // ===== i18n =====
    let currentLang = localStorage.getItem('fbceLang') || 'ku';
    const i18n = {
        "ku": {
            langBtn: "EN",
            dir: "rtl",
            mainTitle: "کۆمێنت دەرهێنەر",
            mainSubtitle: "کۆمێنتەکانی ڤیدیۆکانی فەیسبووک دەربهێنە",
            step1: "Access Token",
            step1Info: "بۆ بەکارهێنانی ئەم تووڵە پێویستت بە <strong>Access Token</strong> ی فەیسبووکە.",
            step1Link: "لێرە دروستی بکە ←",
            tokenPlaceholder: "Access Token لێرە دابنێ...",
            verifyToken: "پشتڕاستکردنەوەی تۆکن",
            step2: "هەڵبژاردنی پەیج",
            pageLabel: "پەیجەکەت هەڵبژێرە",
            pageOption: "-- پەیجێک هەڵبژێرە --",
            step3: "ڤیدیۆکان",
            videoLabel: "لینک یان ID ی پۆست/ڤیدیۆ",
            videoPlaceholder: "لینکی ڤیدیۆ یان Post ID لێرە دابنێ...",
            fetchComments: "دەرهێنانی کۆمێنتەکان",
            fetchAllVideos: "هێنانی هەموو ڤیدیۆکانی پەیج",
            progress: "پێشکەوتن",
            results: "ئەنجامەکان",
            shareLink: "پێدانی لینک",
            exportCSV: "CSV داگرتن",
            exportJSON: "JSON داگرتن",
            summaryTitle: "🏆 کۆی گشتی - ڕیزبەندی",
            tokenEmpty: "تکایە Access Token بنووسە",
            tokenSuccess: "پشتڕاست کرایەوە! {COUNT} پەیج دۆزرایەوە.",
            tokenError: "هەڵە لە تۆکنەکە یان هێڵی ئینتەرنێتدا هەیە",
            noVideoError: "تکایە سەرەتا ڤیدیۆیەک زیاد بکە",
            videoExists: "ئەم ڤیدیۆیە پێشتر زیاد کراوە",
            fetchingComments: "دەرهێنانی کۆمێنتەکانی ڤیدیۆی {ID}...",
            noComments: "هیچ کۆمێنتێک نەدۆزرایەوە",
            foundComments: "{COUNT} کۆمێنت دۆزرایەوە",
            fetchingVideos: "هێنانی ڤیدیۆکانی پەیج...",
            noVideos: "هیچ ڤیدیۆیەک لەم پەیجەدا نەدۆزرایەوە",
            done: "تەواو بوو! ✅",
            error: "هەڵە: ",
            removeVideo: "سڕینەوە",
            shareError: "هیچ داتایەک نییە بۆ شەیرکردن",
            csvUser: "بەکارهێنەر (User)",
            csvId: "ئایدی (ID)",
            csvComment: "کۆمێنت (Comment)",
            csvTime: "کات (Time)",
            csvTotal: "کۆی گشتی (Total)",
            developedBy: "دروستکراوە بۆ شیکاری کۆمێنتەکانی فەیسبووک &bull; ٢٠٢٦"
        },
        "en": {
            langBtn: "KU",
            dir: "ltr",
            mainTitle: "Comments Extractor",
            mainSubtitle: "Extract comments from Facebook videos",
            step1: "Access Token",
            step1Info: "To use this tool, you need a Facebook <strong>Access Token</strong>.",
            step1Link: "Create it here ←",
            tokenPlaceholder: "Paste Access Token here...",
            verifyToken: "Verify Token",
            step2: "Select Page",
            pageLabel: "Choose your page",
            pageOption: "-- Select a page --",
            step3: "Videos",
            videoLabel: "Post/Video Link or ID",
            videoPlaceholder: "Paste Video Link or Post ID here...",
            fetchComments: "Extract Comments",
            fetchAllVideos: "Fetch All Page Videos",
            progress: "Progress",
            results: "Results",
            shareLink: "Share Link",
            exportCSV: "Download CSV",
            exportJSON: "Download JSON",
            summaryTitle: "🏆 Overall Leaderboard",
            tokenEmpty: "Please enter Access Token",
            tokenSuccess: "Verified! Found {COUNT} pages.",
            tokenError: "Error with Token or internet connection",
            noVideoError: "Please add a video first",
            videoExists: "This video is already added",
            fetchingComments: "Extracting comments for video {ID}...",
            noComments: "No comments found",
            foundComments: "Found {COUNT} comments",
            fetchingVideos: "Fetching page videos...",
            noVideos: "No videos found in this page",
            done: "Done! ✅",
            error: "Error: ",
            removeVideo: "Remove",
            shareError: "No data to share",
            csvUser: "User",
            csvId: "ID",
            csvComment: "Comment",
            csvTime: "Time",
            csvTotal: "Total",
            developedBy: "Built for Facebook Comments Analysis &bull; 2026"
        }
    };

    function t(key, replacements = {}) {
        let text = i18n[currentLang][key] || key;
        for (const k in replacements) {
            text = text.replace(`{${k}}`, replacements[k]);
        }
        return text;
    }

    function applyTranslation() {
        const langToggle = document.getElementById('langToggle');
        if (langToggle) langToggle.textContent = i18n[currentLang].langBtn;
        document.documentElement.dir = i18n[currentLang].dir;

        $('#mainTitle').textContent = t('mainTitle');
        $('#mainSubtitle').textContent = t('mainSubtitle');
        
        const step1Badge = $('#tokenSection .card-header h2');
        if (step1Badge) step1Badge.textContent = t('step1');
        
        const infoText = document.querySelector('.info-text');
        if (infoText) {
            infoText.innerHTML = `${t('step1Info')} <a href="https://developers.facebook.com/tools/explorer/" target="_blank" class="link">${t('step1Link')}</a>`;
        }
        
        els.accessToken.placeholder = t('tokenPlaceholder');
        
        const verifyBtnText = els.verifyToken.lastChild;
        if (verifyBtnText && verifyBtnText.nodeType === 3) verifyBtnText.textContent = ' ' + t('verifyToken');
        
        const step2Badge = $('#pageSection .card-header h2');
        if (step2Badge) step2Badge.textContent = t('step2');
        
        const pageLabel = document.querySelector('label[for="pageSelect"]');
        if (pageLabel) pageLabel.textContent = t('pageLabel');
        
        const firstOpt = els.pageSelect.querySelector('option');
        if (firstOpt) firstOpt.textContent = t('pageOption');
        
        const step3Badge = $('#videoSection .card-header h2');
        if (step3Badge) step3Badge.textContent = t('step3');
        
        const videoLabel = document.querySelector('label[for="videoUrl"]');
        if (videoLabel) videoLabel.textContent = t('videoLabel');
        
        els.videoUrl.placeholder = t('videoPlaceholder');
        
        const fetchCommentsText = els.fetchComments.lastChild;
        if (fetchCommentsText && fetchCommentsText.nodeType === 3) fetchCommentsText.textContent = ' ' + t('fetchComments');
        
        const fetchAllVideosText = els.fetchAllVideos.lastChild;
        if (fetchAllVideosText && fetchAllVideosText.nodeType === 3) fetchAllVideosText.textContent = ' ' + t('fetchAllVideos');
        
        const progressHeader = $('#progressSection h2');
        if (progressHeader) progressHeader.textContent = t('progress');
        
        const resultsHeader = $('#resultsSection h2');
        if (resultsHeader) resultsHeader.textContent = t('results');
        
        const shareBtnText = els.shareLink.lastChild;
        if (shareBtnText && shareBtnText.nodeType === 3) shareBtnText.textContent = ' ' + t('shareLink');
        
        const csvBtnText = els.exportCSV.lastChild;
        if (csvBtnText && csvBtnText.nodeType === 3) csvBtnText.textContent = ' ' + t('exportCSV');
        
        const jsonBtnText = els.exportJSON.lastChild;
        if (jsonBtnText && jsonBtnText.nodeType === 3) jsonBtnText.textContent = ' ' + t('exportJSON');
        
        const summaryHeader = $('#summarySection h2');
        if (summaryHeader) summaryHeader.textContent = t('summaryTitle');
        
        const footer = document.querySelector('.footer p');
        if (footer) footer.innerHTML = t('developedBy');
        
        // Re-render UI components if they have data
        renderVideos();
        renderSummary();
    }

    document.addEventListener('DOMContentLoaded', () => {
        applyTranslation();
        const langToggle = document.getElementById('langToggle');
        if (langToggle) {
            langToggle.addEventListener('click', () => {
                currentLang = currentLang === 'ku' ? 'en' : 'ku';
                localStorage.setItem('fbceLang', currentLang);
                applyTranslation();
            });
        }
    });

    // ===== DOM References =====
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const els = {
        accessToken: $('#accessToken'),
        toggleToken: $('#toggleToken'),
        verifyToken: $('#verifyToken'),
        tokenStatus: $('#tokenStatus'),
        pageSection: $('#pageSection'),
        pageSelect: $('#pageSelect'),
        pageStatus: $('#pageStatus'),
        videoSection: $('#videoSection'),
        videoUrl: $('#videoUrl'),
        addVideo: $('#addVideo'),
        videoList: $('#videoList'),
        fetchComments: $('#fetchComments'),
        fetchAllVideos: $('#fetchAllVideos'),
        progressSection: $('#progressSection'),
        progressBar: $('#progressBar'),
        progressText: $('#progressText'),
        progressLog: $('#progressLog'),
        resultsSection: $('#resultsSection'),
        videoTabs: $('#videoTabs'),
        resultsContent: $('#resultsContent'),
        exportCSV: $('#exportCSV'),
        exportJSON: $('#exportJSON'),
        shareLink: $('#shareLink'),
        summarySection: $('#summarySection'),
        summaryContent: $('#summaryContent'),
    };

    // ===== Helpers =====
    function show(el) { el.classList.remove('hidden'); }
    function hide(el) { el.classList.add('hidden'); }

    function setStatus(el, type, msg) {
        el.className = 'status-msg ' + type;
        el.textContent = msg;
        show(el);
    }

    function toArabicNum(n) {
        return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
    }

    function extractPostId(input) {
        input = input.trim();
        // If it's already a numeric/underscore ID like 123456_789012
        if (/^\d+[_]\d+$/.test(input)) return input;
        // If it's just a number
        if (/^\d+$/.test(input)) return input;

        // Try to extract from URL patterns
        // Pattern: /videos/12345/
        let m = input.match(/\/videos\/(\d+)/);
        if (m) return m[1];

        // Pattern: /posts/12345/
        m = input.match(/\/posts\/(\d+)/);
        if (m) return m[1];

        // Pattern: story_fbid=12345
        m = input.match(/story_fbid=(\d+)/);
        if (m) return m[1];

        // Pattern: /permalink/12345
        m = input.match(/\/permalink\/(\d+)/);
        if (m) return m[1];

        // Pattern: pfbid...
        m = input.match(/(pfbid\w+)/);
        if (m) return m[1];

        // Pattern: /watch/?v=12345
        m = input.match(/[?&]v=(\d+)/);
        if (m) return m[1];

        // Pattern: /reel/12345
        m = input.match(/\/reel\/(\d+)/);
        if (m) return m[1];

        // Pattern: photo/a.xxx/yyy
        m = input.match(/\/(\d{10,})/);
        if (m) return m[1];

        // Fallback: return as-is
        return input;
    }

    async function fbApi(endpoint, params = {}) {
        const url = new URL(`https://graph.facebook.com/v19.0/${endpoint}`);
        url.searchParams.set('access_token', state.accessToken);
        for (const [k, v] of Object.entries(params)) {
            url.searchParams.set(k, v);
        }
        const resp = await fetch(url.toString());
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error?.message || `HTTP ${resp.status}`);
        }
        return resp.json();
    }

    async function fetchAllPages(endpoint, params = {}, maxPages = 50) {
        let allData = [];
        let url = null;
        let page = 0;

        // First request
        const firstResult = await fbApi(endpoint, { ...params, limit: '100' });
        allData = allData.concat(firstResult.data || []);
        url = firstResult.paging?.next || null;
        page++;

        // Keep fetching
        while (url && page < maxPages) {
            const resp = await fetch(url);
            if (!resp.ok) break;
            const json = await resp.json();
            allData = allData.concat(json.data || []);
            url = json.paging?.next || null;
            page++;
        }

        return allData;
    }

    function logProgress(msg) {
        const line = document.createElement('div');
        line.className = 'log-line';
        line.textContent = msg;
        els.progressLog.appendChild(line);
        els.progressLog.scrollTop = els.progressLog.scrollHeight;
    }

    // ===== Token Toggle =====
    els.toggleToken.addEventListener('click', () => {
        const inp = els.accessToken;
        inp.type = inp.type === 'password' ? 'text' : 'password';
    });

    // ===== Verify Token =====
    els.verifyToken.addEventListener('click', async () => {
        const token = els.accessToken.value.trim();
        if (!token) {
            setStatus(els.tokenStatus, 'error', `❌ ${t('tokenEmpty')}`);
            return;
        }
        state.accessToken = token;
        els.verifyToken.disabled = true;
        
        const verifyBtnText = els.verifyToken.lastChild;
        if (verifyBtnText && verifyBtnText.nodeType === 3) verifyBtnText.textContent = ' ...';

        try {
            // Verify token
            const me = await fbApi('me', { fields: 'name,id' });
            setStatus(els.tokenStatus, 'success', `✅ Hello ${me.name}!`);

            // Fetch pages
            const pages = await fbApi('me/accounts', { fields: 'name,id,access_token' });
            state.pages = pages.data || [];

            if (state.pages.length === 0) {
                setStatus(els.tokenStatus, 'warning', `⚠️ ${t('tokenSuccess').replace('{COUNT}', '0')}`);
                // Still show video section - user might have a page token directly
                show(els.videoSection);
                state.selectedPage = { access_token: token, id: me.id, name: me.name };
            } else {
                setStatus(els.tokenStatus, 'success', `✅ ${t('tokenSuccess').replace('{COUNT}', state.pages.length)}`);
                // Populate page select
                els.pageSelect.innerHTML = `<option value="">${t('pageOption')}</option>`;
                state.pages.forEach((p, i) => {
                    const opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = p.name;
                    els.pageSelect.appendChild(opt);
                });
                show(els.pageSection);
            }
        } catch (err) {
            setStatus(els.tokenStatus, 'error', `❌ ${t('error')}${err.message}`);
        } finally {
            els.verifyToken.disabled = false;
            els.verifyToken.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                ${t('verifyToken')}
            `;
        }
    });

    // ===== Page Selection =====
    els.pageSelect.addEventListener('change', () => {
        const idx = els.pageSelect.value;
        if (idx === '') return;
        state.selectedPage = state.pages[parseInt(idx)];
        // Switch to page access token
        state.accessToken = state.selectedPage.access_token;
        setStatus(els.pageStatus, 'success', `✅ Selected: "${state.selectedPage.name}"`);
        show(els.videoSection);
    });

    // ===== Add Video =====
    function addVideoToList(id, name) {
        // Check duplicate
        if (state.videos.find(v => v.id === id)) return;
        state.videos.push({ id, name: name || id });
        renderVideoList();
        els.fetchComments.disabled = state.videos.length === 0;
    }

    function renderVideoList() {
        els.videoList.innerHTML = '';
        state.videos.forEach((v, i) => {
            const div = document.createElement('div');
            div.className = 'video-item';
            div.innerHTML = `
                <span class="video-number">${toArabicNum(i + 1)}</span>
                <span class="video-name">${v.name}</span>
                <span class="video-id">${v.id}</span>
                <button class="btn-remove" data-idx="${i}" title="سڕینەوە">✕</button>
            `;
            els.videoList.appendChild(div);
        });

        // Remove handlers
        els.videoList.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                state.videos.splice(idx, 1);
                renderVideoList();
                els.fetchComments.disabled = state.videos.length === 0;
            });
        });
    }

    els.addVideo.addEventListener('click', () => {
        const val = els.videoUrl.value.trim();
        if (!val) return;
        const id = extractPostId(val);
        addVideoToList(id);
        els.videoUrl.value = '';
    });

    els.videoUrl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') els.addVideo.click();
    });

    // ===== Fetch All Page Videos =====
    els.fetchAllVideos.addEventListener('click', async () => {
        if (!state.selectedPage && !state.accessToken) {
            alert('تکایە سەرەتا تۆکن پشتڕاست بکەرەوە و پەیج هەڵبژێرە');
            return;
        }

        els.fetchAllVideos.disabled = true;
        els.fetchAllVideos.textContent = '...هێنانی ڤیدیۆکان';

        try {
            const pageId = state.selectedPage?.id || 'me';

            // Fetch videos
            logProgress('Fetching videos from page...');
            const videos = await fetchAllPages(`${pageId}/videos`, {
                fields: 'id,title,description,created_time',
                type: 'uploaded'
            });

            if (videos.length === 0) {
                // Try posts instead
                logProgress('No videos found, trying posts...');
                const posts = await fetchAllPages(`${pageId}/posts`, {
                    fields: 'id,message,created_time,type'
                });
                
                // Sort posts by date (newest first)
                posts.sort((a, b) => new Date(b.created_time || 0) - new Date(a.created_time || 0));
                
                posts.forEach(p => {
                    const name = (p.message || '').substring(0, 60) || p.id;
                    addVideoToList(p.id, name);
                });
                logProgress(`Found ${posts.length} posts`);
            } else {
                // Sort videos by date (newest first)
                videos.sort((a, b) => new Date(b.created_time || 0) - new Date(a.created_time || 0));
                
                videos.forEach(v => {
                    const name = v.title || v.description?.substring(0, 60) || v.id;
                    addVideoToList(v.id, name);
                });
                logProgress(`Found ${videos.length} videos`);
            }
        } catch (err) {
            alert('هەڵە: ' + err.message);
        } finally {
            els.fetchAllVideos.disabled = false;
            els.fetchAllVideos.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
                    <line x1="7" y1="2" x2="7" y2="22"/>
                    <line x1="17" y1="2" x2="17" y2="22"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <line x1="2" y1="7" x2="7" y2="7"/>
                    <line x1="2" y1="17" x2="7" y2="17"/>
                    <line x1="17" y1="7" x2="22" y2="7"/>
                    <line x1="17" y1="17" x2="22" y2="17"/>
                </svg>
                ${t('fetchAllVideos')}
            `;
        }
    });

    // ===== Fetch Comments =====
    els.fetchComments.addEventListener('click', async () => {
        if (state.videos.length === 0) return;

        els.fetchComments.disabled = true;
        state.results = {};
        state.totals = {};
        show(els.progressSection);
        hide(els.resultsSection);
        hide(els.summarySection);
        els.progressLog.innerHTML = '';
        els.progressBar.style.width = '0%';

        const total = state.videos.length;

        for (let i = 0; i < total; i++) {
            const video = state.videos[i];
            const pct = Math.round(((i) / total) * 100);
            els.progressBar.style.width = pct + '%';
            els.progressText.textContent = `${pct}% - ${i + 1} / ${total}`;
            logProgress(t('fetchingComments').replace('{ID}', `${video.name} (${video.id})`));

            try {
                const comments = await fetchAllPages(`${video.id}/comments`, {
                    fields: 'from{name,id},message,created_time',
                    order: 'chronological',
                    filter: 'stream'
                });

                const parsed = comments.map(c => ({
                    userName: c.from?.name || 'Unknown',
                    userId: c.from?.id || 'unknown',
                    message: c.message || '',
                    time: c.created_time || ''
                }));

                state.results[video.id] = {
                    name: video.name,
                    comments: parsed,
                };

                // Update totals
                parsed.forEach(c => {
                    if (!state.totals[c.userId]) {
                        state.totals[c.userId] = { name: c.userName, count: 0, perVideo: {} };
                    }
                    state.totals[c.userId].count++;
                    if (!state.totals[c.userId].perVideo[video.id]) {
                        state.totals[c.userId].perVideo[video.id] = 0;
                    }
                    state.totals[c.userId].perVideo[video.id]++;
                });

                logProgress(`  → Found ${parsed.length} comments`);
            } catch (err) {
                logProgress(`  ✗ Error: ${err.message}`);
                state.results[video.id] = { name: video.name, comments: [], error: err.message };
            }

            // Small delay to avoid rate limits
            if (i < total - 1) {
                await new Promise(r => setTimeout(r, 500));
            }
        }

        els.progressBar.style.width = '100%';
        els.progressText.textContent = `٪${toArabicNum(100)} - تەواو بوو!`;
        logProgress('✔ All done!');

        renderResults();
        renderSummary();
        els.fetchComments.disabled = false;
    });

    // ===== Render Results =====
    function renderResults() {
        show(els.resultsSection);
        els.videoTabs.innerHTML = '';
        els.resultsContent.innerHTML = '';

        const videoIds = Object.keys(state.results);
        if (videoIds.length === 0) return;

        // Add "all" tab
        const allTab = document.createElement('button');
        allTab.className = 'tab active';
        allTab.textContent = t('mainSubtitle').includes('ل') ? 'هەموو' : 'All'; // quick hack for "All" string
        allTab.dataset.id = '__all__';
        els.videoTabs.appendChild(allTab);

        videoIds.forEach((vid, i) => {
            const tab = document.createElement('button');
            tab.className = 'tab';
            tab.textContent = `${toArabicNum(i + 1)}. ${state.results[vid].name.substring(0, 20)}`;
            tab.dataset.id = vid;
            els.videoTabs.appendChild(tab);
        });

        // Tab click handler
        els.videoTabs.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab')) return;
            els.videoTabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            showResultsForTab(e.target.dataset.id);
        });

        // Show "all" by default
        showResultsForTab('__all__');
    }

    function showResultsForTab(tabId) {
        if (tabId === '__all__') {
            // Show combined per-user counts
            showCombinedResults();
        } else {
            showSingleVideoResults(tabId);
        }
    }

    function showCombinedResults() {
        const sorted = Object.entries(state.totals)
            .sort((a, b) => b[1].count - a[1].count);

        const totalComments = sorted.reduce((s, [, v]) => s + v.count, 0);

        let html = `
            <div class="stats-row">
                <div class="stat-badge">
                    <div class="stat-value">${toArabicNum(totalComments)}</div>
                    <div class="stat-label">${t('csvTotal')}</div>
                </div>
                <div class="stat-badge">
                    <div class="stat-value">${toArabicNum(sorted.length)}</div>
                    <div class="stat-label">${t('csvUser')}</div>
                </div>
                <div class="stat-badge">
                    <div class="stat-value">${toArabicNum(Object.keys(state.results).length)}</div>
                    <div class="stat-label">${t('step3')}</div>
                </div>
            </div>
            <div class="results-table-wrapper">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>${t('csvUser')}</th>
                            <th>${t('csvTotal')}</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        sorted.forEach(([userId, data], i) => {
            const rank = i + 1;
            let rankDisplay = toArabicNum(rank);
            let rankClass = '';
            if (rank === 1) { rankDisplay = '🥇'; rankClass = 'rank-1'; }
            else if (rank === 2) { rankDisplay = '🥈'; rankClass = 'rank-2'; }
            else if (rank === 3) { rankDisplay = '🥉'; rankClass = 'rank-3'; }

            html += `
                <tr class="${rankClass}">
                    <td class="rank-cell ${rank <= 3 ? 'rank-medal' : ''}">${rankDisplay}</td>
                    <td class="name-cell"><a href="https://facebook.com/${userId}" target="_blank" style="color:inherit; text-decoration:none;" onmouseover="this.style.textDecoration='underline';this.style.color='#4361ee'" onmouseout="this.style.textDecoration='none';this.style.color='inherit'">${data.name}</a></td>
                    <td class="count-cell">${toArabicNum(data.count)}</td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        els.resultsContent.innerHTML = html;
    }

    function showSingleVideoResults(videoId) {
        const data = state.results[videoId];
        if (!data) return;

        if (data.error) {
            els.resultsContent.innerHTML = `<div class="status-msg error">❌ هەڵە: ${data.error}</div>`;
            return;
        }

        // Count per user for this video
        const userCounts = {};
        data.comments.forEach(c => {
            if (!userCounts[c.userId]) {
                userCounts[c.userId] = { name: c.userName, count: 0 };
            }
            userCounts[c.userId].count++;
        });

        const sorted = Object.entries(userCounts).sort((a, b) => b[1].count - a[1].count);

        let html = `
            <div class="stats-row">
                <div class="stat-badge">
                    <div class="stat-value">${toArabicNum(data.comments.length)}</div>
                    <div class="stat-label">${t('csvTotal')}</div>
                </div>
                <div class="stat-badge">
                    <div class="stat-value">${toArabicNum(sorted.length)}</div>
                    <div class="stat-label">${t('csvUser')}</div>
                </div>
            </div>
            <div class="results-table-wrapper">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>${t('csvUser')}</th>
                            <th>${t('csvComment')}</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        sorted.forEach(([userId, userData], i) => {
            const rank = i + 1;
            let rankDisplay = toArabicNum(rank);
            let rankClass = '';
            if (rank === 1) { rankDisplay = '🥇'; rankClass = 'rank-1'; }
            else if (rank === 2) { rankDisplay = '🥈'; rankClass = 'rank-2'; }
            else if (rank === 3) { rankDisplay = '🥉'; rankClass = 'rank-3'; }

            html += `
                <tr class="${rankClass}">
                    <td class="rank-cell ${rank <= 3 ? 'rank-medal' : ''}">${rankDisplay}</td>
                    <td class="name-cell"><a href="https://facebook.com/${userId}" target="_blank" style="color:inherit; text-decoration:none;" onmouseover="this.style.textDecoration='underline';this.style.color='#4361ee'" onmouseout="this.style.textDecoration='none';this.style.color='inherit'">${userData.name}</a></td>
                    <td class="count-cell">${toArabicNum(userData.count)}</td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        els.resultsContent.innerHTML = html;
    }

    // ===== Render Summary =====
    function renderSummary() {
        show(els.summarySection);

        const sorted = Object.entries(state.totals)
            .sort((a, b) => b[1].count - a[1].count);

        if (sorted.length === 0) {
            els.summaryContent.innerHTML = '<p style="color:var(--text-muted)">هیچ کۆمێنتێک نەدۆزرایەوە</p>';
            return;
        }

        const totalComments = sorted.reduce((s, [, v]) => s + v.count, 0);
        const videoCount = Object.keys(state.results).length;

        // Build detailed table with per-video breakdown
        let html = `
            <div class="stats-row">
                <div class="stat-badge">
                    <div class="stat-value">${toArabicNum(totalComments)}</div>
                    <div class="stat-label">کۆی هەموو کۆمێنتەکان</div>
                </div>
                <div class="stat-badge">
                    <div class="stat-value">${toArabicNum(sorted.length)}</div>
                    <div class="stat-label">کەس بەشداری کردووە</div>
                </div>
                <div class="stat-badge">
                    <div class="stat-value">${toArabicNum(videoCount)}</div>
                    <div class="stat-label">ڤیدیۆ</div>
                </div>
            </div>
        `;

        // Winner highlight
        if (sorted.length > 0) {
            const winner = sorted[0];
            html += `
                <div style="text-align:center; padding:24px; margin-bottom:20px; 
                    background: linear-gradient(135deg, rgba(251,191,36,0.1), rgba(168,85,247,0.1));
                    border:1px solid rgba(251,191,36,0.3); border-radius:var(--radius-sm);">
                    <div style="font-size:3rem; margin-bottom:8px;">🏆</div>
                    <div style="font-size:1.4rem; font-weight:800; color:var(--gold);">${winner[1].name}</div>
                    <div style="font-size:1rem; color:var(--text-secondary); margin-top:4px;">
                        بە ${toArabicNum(winner[1].count)} کۆمێنت براوەیە!
                    </div>
                </div>
            `;
        }

        // Full ranking table
        html += `
            <div class="results-table-wrapper">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>ڕیز</th>
                            <th>ناو</th>
                            <th>کۆی کۆمێنت</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        sorted.forEach(([userId, data], i) => {
            const rank = i + 1;
            let rankDisplay = toArabicNum(rank);
            let rankClass = '';
            if (rank === 1) { rankDisplay = '🥇'; rankClass = 'rank-1'; }
            else if (rank === 2) { rankDisplay = '🥈'; rankClass = 'rank-2'; }
            else if (rank === 3) { rankDisplay = '🥉'; rankClass = 'rank-3'; }

            html += `
                <tr class="${rankClass}">
                    <td class="rank-cell ${rank <= 3 ? 'rank-medal' : ''}">${rankDisplay}</td>
                    <td class="name-cell"><a href="https://facebook.com/${userId}" target="_blank" style="color:inherit; text-decoration:none;" onmouseover="this.style.textDecoration='underline';this.style.color='#4361ee'" onmouseout="this.style.textDecoration='none';this.style.color='inherit'">${data.name}</a></td>
                    <td class="count-cell">${toArabicNum(data.count)}</td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        els.summaryContent.innerHTML = html;
    }

    // ===== Export CSV =====
    els.exportCSV.addEventListener('click', () => {
        const sorted = Object.entries(state.totals)
            .sort((a, b) => b[1].count - a[1].count);

        if (sorted.length === 0) {
            alert(t('shareError'));
            return;
        }

        // CSV header
        let csv = '\uFEFF'; // BOM for Excel
        csv += `Rank,${t('csvUser')},${t('csvId')},${t('csvTotal')}`;

        // Add per-video columns
        const videoIds = Object.keys(state.results);
        videoIds.forEach((vid, i) => {
            csv += `,Video ${i + 1} (${state.results[vid].name.replace(/,/g, ' ')})`;
        });
        csv += '\n';

        sorted.forEach(([userId, data], i) => {
            csv += `${i + 1},"${data.name}","${userId}",${data.count}`;
            videoIds.forEach(vid => {
                csv += `,${data.perVideo[vid] || 0}`;
            });
            csv += '\n';
        });

        downloadFile(csv, 'facebook_comments_report.csv', 'text/csv;charset=utf-8');
    });

    // ===== Export JSON =====
    els.exportJSON.addEventListener('click', () => {
        const exportData = {
            exportDate: new Date().toISOString(),
            totalVideos: Object.keys(state.results).length,
            videos: {},
            ranking: []
        };

        // Per-video data
        for (const [vid, data] of Object.entries(state.results)) {
            exportData.videos[vid] = {
                name: data.name,
                totalComments: data.comments.length,
                comments: data.comments,
            };
        }

        // Ranking
        const sorted = Object.entries(state.totals)
            .sort((a, b) => b[1].count - a[1].count);
        sorted.forEach(([userId, data], i) => {
            exportData.ranking.push({
                rank: i + 1,
                name: data.name,
                userId,
                totalComments: data.count,
                perVideo: data.perVideo,
            });
        });

        const json = JSON.stringify(exportData, null, 2);
        downloadFile(json, 'facebook_comments_report.json', 'application/json;charset=utf-8');
    });

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ===== Share Link =====
    const VIEWER_BASE_URL = 'https://danyar82.github.io/fb-comments-tool/viewer.html';

    els.shareLink?.addEventListener('click', async () => {
        const sortedArray = Object.entries(state.totals).sort((a, b) => b[1].count - a[1].count);
        if (sortedArray.length === 0) {
            alert(t('shareError'));
            return;
        }

        const originalText = els.shareLink.innerHTML;
        els.shareLink.disabled = true;
        const btnText = els.shareLink.lastChild;
        if (btnText && btnText.nodeType === 3) btnText.textContent = ' ...';

        try {
            // Only keep top 50
            const top50 = sortedArray.slice(0, 50);
            const miniTotals = {};
            top50.forEach(([id, val]) => {
                 miniTotals[id] = { name: val.name, count: val.count };
            });

            const exportData = {
                v: 1, // version
                tv: Object.keys(state.results).length, // total videos
                totals: miniTotals
            };

            const res = await fetch('https://jsonblob.com/api/jsonBlob', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(exportData)
            });

            if (!res.ok) throw new Error('لە دروستکردنی لینکدا کێشەیەک هەیە');

            const id = res.headers.get('x-jsonblob-id');
            const locationHeader = res.headers.get('Location');
            const blobId = id || (locationHeader ? locationHeader.split('/').pop() : null);

            if (blobId) {
                const shareUrl = VIEWER_BASE_URL + '?shared=' + blobId;
                await navigator.clipboard.writeText(shareUrl);
                els.shareLink.innerHTML = 'کۆپی کرا! ✔';
                setTimeout(() => {
                    els.shareLink.innerHTML = originalText;
                    els.shareLink.disabled = false;
                }, 3000);
                alert('لینکەکە کۆپی کرا! ✔\nئێستا دەتوانیت بینێریت بۆ هەر کەسێک و لە هەر براوسەرێک کاردەکات.');
            } else {
                throw new Error('ID نەدۆزرایەوە');
            }

        } catch (e) {
            alert('کێشەیەک هەیە لە کاتی دروستکردنی لینک: ' + e.message);
            els.shareLink.innerHTML = originalText;
            els.shareLink.disabled = false;
        }
    });

    // ===== Load Shared Data on Init =====
    async function loadSharedData() {
        const urlParams = new URLSearchParams(window.location.search);
        const b64 = urlParams.get('d');
        const sharedId = urlParams.get('shared');
        
        if (b64) {
            hide(els.tokenSection);
            hide(els.pageSection);
            hide(els.videoSection);
            
            show(els.progressSection);
            els.progressBar.style.width = '50%';
            els.progressText.textContent = '...';
            
            try {
                const safeB64 = b64.replace(/ /g, '+');
                const jsonStr = decodeURIComponent(escape(atob(safeB64)));
                const data = JSON.parse(jsonStr);
                
                state.results = Array(data.tv || 0).fill({}); 
                state.totals = data.totals || {};
                
                els.progressBar.style.width = '100%';
                els.progressText.textContent = t('done') || 'Done ✔';
                
                setTimeout(() => {
                    hide(els.progressSection);
                    renderSummary();
                }, 800);
            } catch (err) {}
        } else if (sharedId) {
            hide(els.tokenSection);
            hide(els.pageSection);
            hide(els.videoSection);
            show(els.progressSection);
            els.progressBar.style.width = '50%';
            els.progressText.textContent = '...';
            
            try {
                const res = await fetch(`https://jsonblob.com/api/jsonBlob/${sharedId}`);
                if (!res.ok) throw new Error('Error');
                const data = await res.json();
                
                if (data.results) {
                    state.results = data.results;
                    state.totals = data.totals;
                    els.progressBar.style.width = '100%';
                    els.progressText.textContent = t('done') || 'Done ✔';
                    setTimeout(() => {
                        hide(els.progressSection);
                        renderResults();
                        renderSummary();
                    }, 800);
                } else if (data.totals) {
                    state.results = Array(data.tv || 0).fill({}); 
                    state.totals = data.totals || {};
                    els.progressBar.style.width = '100%';
                    els.progressText.textContent = t('done') || 'Done ✔';
                    setTimeout(() => {
                        hide(els.progressSection);
                        renderSummary();
                    }, 800);
                }
            } catch (err) {
                els.progressText.textContent = `❌ Error: ${err.message}`;
                setTimeout(() => {
                    hide(els.progressSection);
                    show(els.tokenSection);
                }, 3000);
            }
        }
    }

    // Check on startup
    loadSharedData();

})();
