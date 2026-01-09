window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Instagram = (function() {
    'use strict';

    // ========== 인스타그램 전용 프롬프트 템플릿 ==========
    const INSTAGRAM_PROMPTS = {
        // 캐릭터가 새 게시물을 올릴 때
        characterPost: (charName, charPersonality, recentContext) => `## Instagram Post Generation
### Core Rules
1. You are ${charName} posting on Instagram.
2. Generate ONLY the post content - no system text, no roleplay actions.
3. Posts should reflect ${charName}'s personality and current mood.
4. Keep captions natural and casual (1-3 sentences).
5. NEVER pretend to be the user or post on their behalf.

### Character Info
- Name: ${charName}
- Personality: ${charPersonality || 'friendly and casual'}

### Recent Context
${recentContext || 'Just a normal day.'}

### Task
Write an Instagram post caption that ${charName} would naturally post. Include relevant hashtags if fitting the character's style.
Output format - ONLY the caption text, nothing else:`,

        // 캐릭터가 유저 게시물에 댓글 달 때
        characterComment: (charName, charPersonality, postCaption, postAuthor) => `## Instagram Comment Generation
### Core Rules
1. You are ${charName} commenting on an Instagram post.
2. Generate ONLY the comment text - no quotes, no actions, no system text.
3. Comments should be natural, casual Instagram style.
4. Keep it short (1-2 sentences max).
5. Match ${charName}'s personality in tone and style.

### Character Info
- Name: ${charName}
- Personality: ${charPersonality || 'friendly'}

### Post Info
- Posted by: ${postAuthor}
- Caption: "${postCaption || '(photo post)'}"

### Task
Write a natural Instagram comment that ${charName} would leave on this post.
Output format - ONLY the comment text, nothing else:`,

        // 캐릭터가 댓글에 답글 달 때
        characterReply: (charName, charPersonality, postCaption, originalComment, commenter) => `## Instagram Reply Generation
### Core Rules
1. You are ${charName} replying to a comment on your Instagram post.
2. Generate ONLY the reply text - no quotes, no actions.
3. Keep it short and casual (1-2 sentences).
4. Respond naturally to what the commenter said.

### Your Post
Caption: "${postCaption || '(photo post)'}"

### Comment to Reply
${commenter} said: "${originalComment}"

### Task
Write a natural reply that ${charName} would give to this comment.
Output format - ONLY the reply text, nothing else:`,

        // 이미지 프롬프트 생성용
        imagePrompt: (charName, postDescription, visualTags) => `## Instagram Photo Generation
### Visual Tag Library
${visualTags}

### Task
User's request: "${postDescription}"
Based on the Library, identify characters and generate Stable Diffusion tags.

Example output format:
<pic prompt="tags, comma, separated">`
    };

    const css = `
        <style>
            .st-insta-app {
                position: absolute; top: 0; left: 0;
                width: 100%; height: 100%; z-index: 999;
                display: flex; flex-direction: column;
                background: var(--pt-bg-color, #fafafa);
                color: var(--pt-text-color, #262626);
                font-family: var(--pt-font, -apple-system, sans-serif);
            }
            .st-insta-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 12px 16px; border-bottom: 1px solid var(--pt-border, #dbdbdb);
                background: var(--pt-bg-color, #fff); flex-shrink: 0;
            }
            .st-insta-logo {
                font-family: 'Billabong', cursive, sans-serif; font-size: 24px; font-weight: 500;
                background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
                -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
            }
            .st-insta-header-icons { display: flex; gap: 16px; font-size: 20px; }
            .st-insta-header-icon { cursor: pointer; color: var(--pt-text-color, #262626); }
            .st-insta-tabs {
                display: flex; border-bottom: 1px solid var(--pt-border, #dbdbdb);
                background: var(--pt-bg-color, #fff); flex-shrink: 0;
            }
            .st-insta-tab {
                flex: 1; padding: 12px; text-align: center; font-size: 14px; font-weight: 500;
                cursor: pointer; border-bottom: 2px solid transparent;
                color: var(--pt-sub-text, #8e8e8e); transition: all 0.2s;
            }
            .st-insta-tab.active { color: var(--pt-text-color, #262626); border-bottom-color: var(--pt-text-color, #262626); }
            .st-insta-feed { flex: 1; overflow-y: auto; padding-bottom: 80px; }
            .st-insta-post { background: var(--pt-card-bg, #fff); border-bottom: 1px solid var(--pt-border, #dbdbdb); margin-bottom: 12px; }
            .st-insta-post-header { display: flex; align-items: center; padding: 12px 14px; gap: 10px; }
            .st-insta-post-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
            .st-insta-post-user { flex: 1; }
            .st-insta-post-username { font-weight: 600; font-size: 14px; }
            .st-insta-post-location { font-size: 12px; color: var(--pt-sub-text, #8e8e8e); }
            .st-insta-post-more { font-size: 16px; cursor: pointer; padding: 5px; }
            .st-insta-post-image { width: 100%; aspect-ratio: 1; object-fit: cover; background: #f0f0f0; }
            .st-insta-post-image-placeholder {
                width: 100%; aspect-ratio: 1;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex; align-items: center; justify-content: center; color: white; font-size: 48px;
            }
            .st-insta-post-actions { display: flex; align-items: center; padding: 10px 14px; gap: 14px; }
            .st-insta-action-btn {
                font-size: 22px; cursor: pointer; background: none; border: none; padding: 0;
                color: var(--pt-text-color, #262626); transition: transform 0.1s;
            }
            .st-insta-action-btn:active { transform: scale(0.9); }
            .st-insta-action-btn.liked { color: #ed4956; }
            .st-insta-action-spacer { flex: 1; }
            .st-insta-post-likes { padding: 0 14px 8px; font-weight: 600; font-size: 14px; }
            .st-insta-post-caption { padding: 0 14px 8px; font-size: 14px; line-height: 1.4; }
            .st-insta-post-caption strong { font-weight: 600; margin-right: 5px; }
            .st-insta-view-comments { padding: 0 14px 8px; font-size: 14px; color: var(--pt-sub-text, #8e8e8e); cursor: pointer; }
            .st-insta-comments { padding: 0 14px 8px; }
            .st-insta-comment { font-size: 14px; margin-bottom: 6px; display: flex; align-items: flex-start; gap: 8px; }
            .st-insta-comment-avatar { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
            .st-insta-comment-content { flex: 1; }
            .st-insta-comment strong { font-weight: 600; margin-right: 5px; }
            .st-insta-comment-time { font-size: 11px; color: var(--pt-sub-text, #8e8e8e); margin-top: 2px; }
            .st-insta-post-time { padding: 0 14px 12px; font-size: 10px; color: var(--pt-sub-text, #8e8e8e); text-transform: uppercase; }
            .st-insta-comment-input-wrap { display: flex; align-items: center; padding: 10px 14px; border-top: 1px solid var(--pt-border, #efefef); gap: 10px; }
            .st-insta-comment-input { flex: 1; border: none; background: transparent; font-size: 14px; outline: none; color: var(--pt-text-color, #262626); }
            .st-insta-comment-input::placeholder { color: var(--pt-sub-text, #8e8e8e); }
            .st-insta-comment-post { color: #0095f6; font-weight: 600; font-size: 14px; cursor: pointer; background: none; border: none; }
            .st-insta-comment-post:disabled { opacity: 0.3; cursor: default; }
            .st-insta-fab {
                position: absolute; bottom: 85px; right: 20px; width: 56px; height: 56px; border-radius: 50%;
                background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
                color: white; border: none; font-size: 24px; cursor: pointer;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 100;
            }
            .st-insta-new-post {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: var(--pt-bg-color, #fff); display: flex; flex-direction: column; z-index: 1001;
            }
            .st-insta-new-header { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--pt-border, #dbdbdb); }
            .st-insta-new-back { font-size: 24px; cursor: pointer; padding: 5px; color: var(--pt-text-color, #262626); }
            .st-insta-new-title { flex: 1; text-align: center; font-weight: 600; font-size: 16px; }
            .st-insta-new-share { color: #0095f6; font-weight: 600; font-size: 14px; cursor: pointer; background: none; border: none; }
            .st-insta-new-content { flex: 1; display: flex; flex-direction: column; padding: 16px; gap: 16px; overflow-y: auto; }
            .st-insta-new-image-area {
                width: 100%; aspect-ratio: 1; background: var(--pt-card-bg, #f0f0f0); border-radius: 12px;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                cursor: pointer; border: 2px dashed var(--pt-border, #dbdbdb); overflow: hidden;
            }
            .st-insta-new-image-area.has-image { border: none; }
            .st-insta-new-image-area img { width: 100%; height: 100%; object-fit: cover; }
            .st-insta-new-image-placeholder { text-align: center; color: var(--pt-sub-text, #8e8e8e); }
            .st-insta-new-image-placeholder i { font-size: 48px; margin-bottom: 10px; }
            .st-insta-new-caption {
                width: 100%; min-height: 80px; border: 1px solid var(--pt-border, #dbdbdb); border-radius: 12px;
                padding: 12px; font-size: 14px; resize: none; outline: none;
                background: var(--pt-card-bg, #fff); color: var(--pt-text-color, #262626);
            }
            .st-insta-image-url-input {
                width: 100%; padding: 12px; border: 1px solid var(--pt-border, #dbdbdb); border-radius: 8px;
                font-size: 14px; outline: none; background: var(--pt-card-bg, #fff); color: var(--pt-text-color, #262626);
            }
            .st-insta-empty {
                flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
                color: var(--pt-sub-text, #8e8e8e); padding: 40px; text-align: center;
            }
            .st-insta-empty i { font-size: 64px; margin-bottom: 16px; opacity: 0.5; }
            .st-insta-loading { display: flex; align-items: center; justify-content: center; padding: 20px; color: var(--pt-sub-text, #8e8e8e); }
            .st-insta-spinner { width: 24px; height: 24px; border: 2px solid var(--pt-border, #dbdbdb); border-top-color: #262626; border-radius: 50%; animation: insta-spin 0.8s linear infinite; }
            @keyframes insta-spin { to { transform: rotate(360deg); } }
            .st-insta-post-detail {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: var(--pt-bg-color, #fff); display: flex; flex-direction: column; z-index: 1002;
            }
            .st-insta-detail-header { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--pt-border, #dbdbdb); }
            .st-insta-detail-back { font-size: 24px; cursor: pointer; padding: 5px; color: var(--pt-text-color, #262626); }
            .st-insta-detail-title { flex: 1; text-align: center; font-weight: 600; font-size: 16px; }
            .st-insta-detail-content { flex: 1; overflow-y: auto; }
            .st-insta-generating { display: flex; align-items: center; gap: 8px; padding: 12px 14px; color: var(--pt-sub-text, #8e8e8e); font-size: 13px; }
        </style>
    `;

    const DEFAULT_AVATAR = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';

    // ========== 최적화 변수 ==========
    let saveTimer = null;
    let cssInjected = false;
    let lastLoadedChatId = null;

    let posts = [];
    let currentTab = 'feed';

    // ========== 선제 포스트 시스템 변수 (messages.js 참고) ==========
    let lastProactivePostCheck = 0;
    const PROACTIVE_POST_COOLDOWN = 120000; // 2분
    let isGeneratingPost = false;

    // ========== 저장소 ==========
    function getStorageKey() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;
        return 'st_phone_instagram_' + context.chatId;
    }

    function loadPosts() {
        const ctx = window.SillyTavern?.getContext?.();
        const currentChatId = ctx?.chatId;
        if (currentChatId && currentChatId === lastLoadedChatId && posts.length > 0) return;
        const key = getStorageKey();
        if (!key) { posts = []; lastLoadedChatId = null; return; }
        try {
            posts = JSON.parse(localStorage.getItem(key) || '[]');
            lastLoadedChatId = currentChatId;
        } catch (e) { posts = []; lastLoadedChatId = null; }
    }

    function savePosts() {
        const key = getStorageKey();
        if (!key) return;
        try {
            localStorage.setItem(key, JSON.stringify(posts));
        } catch (e) {
            console.error('[Instagram] 저장 실패:', e);
        }
    }

    function debouncedSavePosts(delay = 300) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => savePosts(), delay);
    }

    // ========== 유틸리티 ==========
    function getUserName() {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        return settings.userName || window.SillyTavern?.getContext?.()?.name1 || 'User';
    }

    function getUserAvatar() {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        return settings.userAvatar || DEFAULT_AVATAR;
    }

    function getCharacterInfo() {
        const context = window.SillyTavern?.getContext?.();
        if (!context) return { name: 'Character', avatar: DEFAULT_AVATAR, personality: '' };
        const charName = context.name2 || 'Character';
        const charAvatar = context.characters?.[context.characterId]?.avatar
            ? `/characters/${context.characters[context.characterId].avatar}`
            : DEFAULT_AVATAR;
        const charPersonality = context.characters?.[context.characterId]?.personality ||
                               context.characters?.[context.characterId]?.description || '';
        return { name: charName, avatar: charAvatar, personality: charPersonality };
    }

    function getContacts() {
        if (!window.STPhone.Apps?.Contacts?.getAllContacts) return [];
        return window.STPhone.Apps.Contacts.getAllContacts() || [];
    }

    function getRandomContact() {
        const contacts = getContacts();
        if (contacts.length === 0) return null;
        return contacts[Math.floor(Math.random() * contacts.length)];
    }

    function getContactByName(name) {
        const contacts = getContacts();
        return contacts.find(c => c.name && c.name.toLowerCase() === name?.toLowerCase());
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        if (diffDays < 7) return `${diffDays}일 전`;
        return `${date.getMonth() + 1}월 ${date.getDate()}일`;
    }

    function getRecentChatContext() {
        try {
            const context = window.SillyTavern?.getContext?.();
            if (!context?.chat) return '';
            const recentMsgs = context.chat.slice(-10).filter(m => !m.extra?.is_phone_log);
            return recentMsgs.map(m => `${m.name}: ${m.mes?.substring(0, 100) || ''}`).join('\n');
        } catch (e) { return ''; }
    }

    // ========== 이미지 생성 (카메라 앱 참고) ==========
    function getSlashCommandParser() {
        if (window.SlashCommandParser && window.SlashCommandParser.commands) return window.SlashCommandParser;
        if (window.SillyTavern) {
            const ctx = typeof window.SillyTavern.getContext === 'function' ? window.SillyTavern.getContext() : window.SillyTavern;
            if (ctx && ctx.SlashCommandParser && ctx.SlashCommandParser.commands) return ctx.SlashCommandParser;
        }
        if (typeof SlashCommandParser !== 'undefined' && SlashCommandParser.commands) return SlashCommandParser;
        return null;
    }

    function getExecuteSlashCommand() {
        if (window.SillyTavern) {
            const ctx = typeof window.SillyTavern.getContext === 'function' ? window.SillyTavern.getContext() : window.SillyTavern;
            if (ctx && typeof ctx.executeSlashCommands === 'function') return ctx.executeSlashCommands;
            if (ctx && typeof ctx.executeSlashCommand === 'function') return ctx.executeSlashCommand;
        }
        if (typeof executeSlashCommands === 'function') return executeSlashCommands;
        if (typeof executeSlashCommand === 'function') return executeSlashCommand;
        return null;
    }

    async function generateImage(prompt) {
        const parser = getSlashCommandParser();
        if (parser && parser.commands) {
            const sdCmd = parser.commands['sd'] || parser.commands['draw'] || parser.commands['imagine'];
            if (sdCmd && typeof sdCmd.callback === 'function') {
                try {
                    const result = await sdCmd.callback({ quiet: 'true' }, prompt);
                    if (result && typeof result === 'string') return result;
                } catch (e) { console.warn("[Instagram] sd.callback 실패:", e); }
            }
        }
        const executeCmd = getExecuteSlashCommand();
        if (executeCmd) {
            try {
                const result = await executeCmd(`/sd quiet=true ${prompt}`);
                if (result && result.pipe) return result.pipe;
                if (typeof result === 'string') return result;
            } catch (e) { console.warn("[Instagram] executeSlashCommands 실패:", e); }
        }
        return null;
    }

    async function generateImagePrompt(userInput) {
        const parser = getSlashCommandParser();
        if (!parser || !parser.commands) return userInput;
        const genCmd = parser.commands['genraw'] || parser.commands['gen'];
        if (!genCmd || typeof genCmd.callback !== 'function') return userInput;
        try {
            const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
            const userName = settings.userName || 'User';
            const userTags = settings.userTags || '';
            const allContacts = window.STPhone.Apps?.Contacts?.getAllContacts?.() || [];
            let visualLibrary = `1. [${userName} (User)]: ${userTags}\n`;
            let lineNumber = 2;
            for (const contact of allContacts) {
                const name = contact?.name;
                const tags = contact?.tags;
                if (!name || !tags) continue;
                visualLibrary += `${lineNumber}. [${name}]: ${tags}\n`;
                lineNumber++;
            }
            const charInfo = getCharacterInfo();
            const aiInstruction = INSTAGRAM_PROMPTS.imagePrompt(charInfo.name, userInput, visualLibrary);
            const aiResponse = await genCmd.callback({ quiet: 'true' }, aiInstruction);
            const regex = /<pic[^>]*\sprompt="([^"]*)"[^>]*?>/i;
            const match = String(aiResponse).match(regex);
            if (match && match[1] && match[1].trim().length > 0) return match[1];
        } catch (e) { console.warn("[Instagram] AI 이미지 프롬프트 생성 실패:", e); }
        return userInput;
    }

    // ========== AI 생성 (Messages 모듈 사용) ==========
    async function generateWithAI(prompt, maxTokens = 300) {
        if (window.STPhone.Apps?.Messages?.generateWithProfile) {
            try {
                const result = await window.STPhone.Apps.Messages.generateWithProfile(prompt, maxTokens);
                return result;
            } catch (e) { console.error('[Instagram] generateWithProfile 실패:', e); }
        }
        try {
            const parser = getSlashCommandParser();
            const genCmd = parser?.commands['genraw'] || parser?.commands['gen'];
            if (!genCmd) { console.error('[Instagram] AI 명령어를 찾을 수 없습니다'); return null; }
            const result = await genCmd.callback({ quiet: 'true' }, prompt);
            return String(result || '').trim();
        } catch (e) { console.error('[Instagram] AI 생성 실패:', e); return null; }
    }

    // ========== 히든 로그 ==========
    function addHiddenLog(speaker, text) {
        if (window.STPhone.Apps?.Messages?.addHiddenLog) {
            window.STPhone.Apps.Messages.addHiddenLog(speaker, text);
            return;
        }
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chat) return;
        context.chat.push({
            name: speaker, is_user: false, is_system: false, send_date: Date.now(),
            mes: text, extra: { is_phone_log: true, is_instagram: true }
        });
        if (window.SlashCommandParser?.commands['savechat']) {
            window.SlashCommandParser.commands['savechat'].callback({});
        }
    }

    // ========== 메인 UI ==========
    function open() {
        loadPosts();
        const $screen = window.STPhone.UI.getContentElement();
        if (!$screen || !$screen.length) return;
        $screen.empty();

        const html = `
            ${css}
            <div class="st-insta-app">
                <div class="st-insta-header">
                    <div class="st-insta-logo">Instagram</div>
                    <div class="st-insta-header-icons">
                        <i class="fa-regular fa-heart st-insta-header-icon" id="st-insta-notif"></i>
                    </div>
                </div>
                <div class="st-insta-tabs">
                    <div class="st-insta-tab active" data-tab="feed">
                        <i class="fa-solid fa-house"></i> 피드
                    </div>
                </div>
                <div id="st-insta-content"></div>
                <button class="st-insta-fab" id="st-insta-new-btn">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
        `;

        $screen.append(html);
        renderTab(currentTab);
        attachListeners();
    }

    function renderTab(tab) {
        currentTab = tab;
        const $content = $('#st-insta-content');
        $content.empty();
        if (tab === 'feed') renderFeed($content);
    }

    // ========== 피드 렌더링 ==========
    function renderFeed($content) {
        if (posts.length === 0) {
            $content.html(`
                <div class="st-insta-empty">
                    <i class="fa-regular fa-image"></i>
                    <div>아직 게시물이 없어요</div>
                    <div style="font-size:13px;margin-top:8px;">+ 버튼을 눌러 첫 게시물을 올려보세요!</div>
                </div>
            `);
            return;
        }

        let feedHtml = '<div class="st-insta-feed">';
        const sortedPosts = [...posts].sort((a, b) => b.timestamp - a.timestamp);
        sortedPosts.forEach(post => { feedHtml += renderPostCard(post); });
        feedHtml += '</div>';
        $content.html(feedHtml);
        attachPostListeners();
    }

    function renderPostCard(post) {
        const isLiked = post.likedByUser || false;
        const likeCount = post.likes || 0;
        let imageHtml = post.imageUrl
            ? `<img src="${post.imageUrl}" class="st-insta-post-image" alt="post">`
            : `<div class="st-insta-post-image-placeholder"><i class="fa-regular fa-image"></i></div>`;

        let commentsPreview = '';
        if (post.comments && post.comments.length > 0) {
            const previewComments = post.comments.slice(0, 2);
            commentsPreview = previewComments.map(c => `
                <div class="st-insta-comment"><strong>${c.author}</strong>${c.text}</div>
            `).join('');
            if (post.comments.length > 2) {
                commentsPreview = `<div class="st-insta-view-comments" data-post-id="${post.id}">댓글 ${post.comments.length}개 모두 보기</div>` + commentsPreview;
            }
        }

        return `
            <div class="st-insta-post" data-post-id="${post.id}">
                <div class="st-insta-post-header">
                    <img src="${post.authorAvatar || DEFAULT_AVATAR}" class="st-insta-post-avatar">
                    <div class="st-insta-post-user">
                        <div class="st-insta-post-username">${post.author}</div>
                        ${post.location ? `<div class="st-insta-post-location">${post.location}</div>` : ''}
                    </div>
                    <div class="st-insta-post-more" data-post-id="${post.id}"></div>
                </div>
                ${imageHtml}
                <div class="st-insta-post-actions">
                    <button class="st-insta-action-btn ${isLiked ? 'liked' : ''}" data-action="like" data-post-id="${post.id}">
                        <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i>
                    </button>
                    <button class="st-insta-action-btn" data-action="comment" data-post-id="${post.id}">
                        <i class="fa-regular fa-comment"></i>
                    </button>
                    <button class="st-insta-action-btn" data-action="share" data-post-id="${post.id}">
                        <i class="fa-regular fa-paper-plane"></i>
                    </button>
                    <div class="st-insta-action-spacer"></div>
                    <button class="st-insta-action-btn" data-action="save" data-post-id="${post.id}">
                        <i class="fa-regular fa-bookmark"></i>
                    </button>
                </div>
                <div class="st-insta-post-likes">좋아요 ${likeCount}개</div>
                ${post.caption ? `<div class="st-insta-post-caption"><strong>${post.author}</strong>${post.caption}</div>` : ''}
                <div class="st-insta-comments" data-post-id="${post.id}">${commentsPreview}</div>
                <div class="st-insta-post-time">${formatTime(post.timestamp)}</div>
                <div class="st-insta-comment-input-wrap">
                    <input type="text" class="st-insta-comment-input" placeholder="댓글 달기..." data-post-id="${post.id}">
                    <button class="st-insta-comment-post" data-post-id="${post.id}" disabled>게시</button>
                </div>
            </div>
        `;
    }

    // ========== 이벤트 리스너 ==========
    function attachListeners() {
        $('.st-insta-tab').off('click').on('click', function() {
            const tab = $(this).data('tab');
            $('.st-insta-tab').removeClass('active');
            $(this).addClass('active');
            renderTab(tab);
        });
        $('#st-insta-new-btn').off('click').on('click', openNewPostModal);
    }

    function attachPostListeners() {
        $('[data-action="like"]').off('click').on('click', async function() {
            const postId = $(this).data('post-id');
            await toggleLike(postId);
        });
        $('.st-insta-comment-input').off('input').on('input', function() {
            const postId = $(this).data('post-id');
            const hasText = $(this).val().trim().length > 0;
            $(`.st-insta-comment-post[data-post-id="${postId}"]`).prop('disabled', !hasText);
        });
        $('.st-insta-comment-post').off('click').on('click', async function() {
            const postId = $(this).data('post-id');
            const $input = $(`.st-insta-comment-input[data-post-id="${postId}"]`);
            const text = $input.val().trim();
            if (text) { await addComment(postId, text, true); $input.val(''); $(this).prop('disabled', true); }
        });
        $('.st-insta-comment-input').off('keypress').on('keypress', function(e) {
            if (e.which === 13) $(`.st-insta-comment-post[data-post-id="${$(this).data('post-id')}"]`).click();
        });
        $('.st-insta-view-comments').off('click').on('click', function() { openPostDetail($(this).data('post-id')); });
        $('.st-insta-post-more').off('click').on('click', function() {
            const postId = $(this).data('post-id');
            const post = posts.find(p => p.id === postId);
            if (post?.isUser && confirm('이 게시물을 삭제하시겠습니까?')) deletePost(postId);
        });
    }

    // ========== 좋아요 기능 ==========
    async function toggleLike(postId) {
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        post.likedByUser = !post.likedByUser;
        post.likes = (post.likes || 0) + (post.likedByUser ? 1 : -1);
        if (post.likes < 0) post.likes = 0;
        debouncedSavePosts();
        const $btn = $(`[data-action="like"][data-post-id="${postId}"]`);
        const $likesDiv = $btn.closest('.st-insta-post').find('.st-insta-post-likes');
        if (post.likedByUser) {
            $btn.addClass('liked').find('i').removeClass('fa-regular').addClass('fa-solid');
        } else {
            $btn.removeClass('liked').find('i').removeClass('fa-solid').addClass('fa-regular');
        }
        $likesDiv.text(`좋아요 ${post.likes}개`);
        const userName = getUserName();
        if (post.likedByUser) addHiddenLog(userName, `[ Instagram] ${userName}님이 ${post.author}의 게시물에 좋아요를 눌렀습니다.`);
    }

    // ========== 댓글 기능 ==========
    async function addComment(postId, text, isUser = false) {
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        if (!post.comments) post.comments = [];
        const userName = getUserName();
        const userAvatar = getUserAvatar();
        const myComment = { id: Date.now(), author: userName, authorAvatar: userAvatar, text: text, timestamp: Date.now(), isUser: true };
        post.comments.push(myComment);
        debouncedSavePosts();
        addHiddenLog(userName, `[ Instagram] ${userName}님이 ${post.author}의 게시물에 댓글을 남겼습니다: "${text}"`);
        refreshPostComments(postId);
        if (!post.isUser && isUser) await generateAIReplyToComment(postId, myComment);
    }

    async function generateAIReplyToComment(postId, userComment) {
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const charInfo = getCharacterInfo();
        const $commentsDiv = $(`.st-insta-comments[data-post-id="${postId}"]`);
        $commentsDiv.append(`<div class="st-insta-generating" id="st-insta-generating-${postId}"><div class="st-insta-spinner"></div><span>${post.author}님이 답글을 작성 중...</span></div>`);
        try {
            const prompt = INSTAGRAM_PROMPTS.characterReply(post.author, charInfo.personality, post.caption, userComment.text, userComment.author);
            const reply = await generateWithAI(prompt, 150);
            $(`#st-insta-generating-${postId}`).remove();
            if (reply && reply.trim()) {
                const cleanReply = reply.replace(/^["']|["']$/g, '').trim();
                const aiComment = { id: Date.now(), author: post.author, authorAvatar: post.authorAvatar, text: cleanReply, timestamp: Date.now(), isUser: false, replyTo: userComment.author };
                post.comments.push(aiComment);
                debouncedSavePosts();
                addHiddenLog(post.author, `[ Instagram] ${post.author}님이 ${userComment.author}의 댓글에 답글을 남겼습니다: "${cleanReply}"`);
                refreshPostComments(postId);
            }
        } catch (e) { console.error('[Instagram] AI 답글 생성 실패:', e); $(`#st-insta-generating-${postId}`).remove(); }
    }

    function refreshPostComments(postId) {
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const $commentsDiv = $(`.st-insta-comments[data-post-id="${postId}"]`);
        let html = '';
        if (post.comments && post.comments.length > 0) {
            const previewComments = post.comments.slice(-3);
            if (post.comments.length > 3) html += `<div class="st-insta-view-comments" data-post-id="${postId}">댓글 ${post.comments.length}개 모두 보기</div>`;
            html += previewComments.map(c => `<div class="st-insta-comment"><strong>${c.author}</strong>${c.replyTo ? `<span style="color:#8e8e8e">@${c.replyTo}</span> ` : ''}${c.text}</div>`).join('');
        }
        $commentsDiv.html(html);
        $commentsDiv.find('.st-insta-view-comments').off('click').on('click', function() { openPostDetail(postId); });
    }

    // ========== 새 글 작성 ==========
    function openNewPostModal() {
        const $app = $('.st-insta-app');
        const modalHtml = `
            <div class="st-insta-new-post" id="st-insta-new-modal">
                <div class="st-insta-new-header">
                    <div class="st-insta-new-back" id="st-insta-new-close"></div>
                    <div class="st-insta-new-title">새 게시물</div>
                    <button class="st-insta-new-share" id="st-insta-share-btn">공유</button>
                </div>
                <div class="st-insta-new-content">
                    <div class="st-insta-new-image-area" id="st-insta-image-area">
                        <div class="st-insta-new-image-placeholder">
                            <i class="fa-solid fa-wand-magic-sparkles"></i>
                            <div>AI가 이미지를 생성합니다</div>
                        </div>
                    </div>
                    <input type="text" class="st-insta-image-url-input" id="st-insta-image-prompt" placeholder=" 이미지 프롬프트 (예: 카페에서 커피 마시는 모습)">
                    <textarea class="st-insta-new-caption" id="st-insta-caption" placeholder="문구 입력..."></textarea>
                </div>
            </div>
        `;
        $app.append(modalHtml);
        $('#st-insta-new-close').on('click', () => $('#st-insta-new-modal').remove());
        $('#st-insta-share-btn').on('click', async () => {
            const imagePrompt = $('#st-insta-image-prompt').val().trim();
            const caption = $('#st-insta-caption').val().trim();
            if (!caption && !imagePrompt) { toastr.warning('게시글이나 이미지 프롬프트를 입력해주세요'); return; }
            $('#st-insta-share-btn').prop('disabled', true).text('업로드 중...');
            await createPost('', caption, imagePrompt);
            $('#st-insta-new-modal').remove();
        });
    }

    // ========== 게시물 생성 ==========
    async function createPost(imageUrl, caption, imagePromptText = '') {
        const userName = getUserName();
        const userAvatar = getUserAvatar();
        let finalImageUrl = imageUrl;
        if (!finalImageUrl && imagePromptText) {
            try { toastr.info(' 이미지 생성 중...'); finalImageUrl = await generateImage(imagePromptText); }
            catch (e) { console.warn('[Instagram] 이미지 생성 실패:', e); }
        }
        const newPost = {
            id: Date.now(), author: userName, authorAvatar: userAvatar, imageUrl: finalImageUrl || null,
            caption: caption, timestamp: Date.now(), likes: 0, likedByUser: false, comments: [], isUser: true
        };
        posts.unshift(newPost);
        debouncedSavePosts();
        addHiddenLog(userName, `[ Instagram] ${userName}님이 새 게시물을 올렸습니다: "${caption || '(사진 게시물)'}"`);
        toastr.success('게시물이 공유되었습니다!');
        // AI 반응 생성 (연락처 랜덤 댓글 포함)
        await generateAIReactions(newPost.id);
        renderTab('feed');
    }

    // ========== AI 반응 생성 (좋아요 + 연락처 랜덤 댓글) - messages.js 참고 ==========
    async function generateAIReactions(postId) {
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const charInfo = getCharacterInfo();
        const contacts = getContacts();

        // 반응할 캐릭터들: 메인 캐릭터 + 연락처에서 랜덤 1~3명
        let reactors = [{ name: charInfo.name, avatar: charInfo.avatar, personality: charInfo.personality, isMain: true }];
        const shuffledContacts = contacts.filter(c => c.name !== charInfo.name && !c.isUser).sort(() => Math.random() - 0.5);
        const contactReactorCount = Math.min(Math.floor(Math.random() * 3) + 1, shuffledContacts.length);
        for (let i = 0; i < contactReactorCount; i++) {
            reactors.push({ name: shuffledContacts[i].name, avatar: shuffledContacts[i].avatar || DEFAULT_AVATAR, personality: shuffledContacts[i].personality || '', isMain: false });
        }

        // 각 반응자별 좋아요 + 댓글
        for (const reactor of reactors) {
            // 좋아요 (70% 확률)
            if (Math.random() < 0.7) {
                post.likes = (post.likes || 0) + 1;
                addHiddenLog(reactor.name, `[ Instagram] ${reactor.name}님이 ${post.author}의 게시물에 좋아요를 눌렀습니다.`);
            }

            // 댓글 (메인 캐릭터 100%, 연락처 50% 확률)
            const shouldComment = reactor.isMain || Math.random() < 0.5;
            if (shouldComment) {
                try {
                    const prompt = INSTAGRAM_PROMPTS.characterComment(reactor.name, reactor.personality, post.caption, post.author);
                    const comment = await generateWithAI(prompt, 150);
                    if (comment && comment.trim()) {
                        const cleanComment = comment.replace(/^["']|["']$/g, '').trim();
                        const aiComment = { id: Date.now() + Math.random(), author: reactor.name, authorAvatar: reactor.avatar, text: cleanComment, timestamp: Date.now(), isUser: false };
                        post.comments.push(aiComment);
                        addHiddenLog(reactor.name, `[ Instagram] ${reactor.name}님이 ${post.author}의 게시물에 댓글을 남겼습니다: "${cleanComment}"`);
                    }
                } catch (e) { console.error(`[Instagram] ${reactor.name} 댓글 생성 실패:`, e); }
            }
        }
        debouncedSavePosts();
    }

    // ========== 캐릭터 게시물 생성 (선제 포스트) ==========
    async function generateCharacterPost(charName) {
        if (isGeneratingPost) { console.log(' [Instagram] 이미 게시물 생성 중'); return; }
        isGeneratingPost = true;
        loadPosts();

        // 캐릭터 정보 가져오기
        let contact = getContactByName(charName);
        let posterName, posterAvatar, posterPersonality;
        if (contact) {
            posterName = contact.name;
            posterAvatar = contact.avatar || DEFAULT_AVATAR;
            posterPersonality = contact.personality || '';
        } else {
            const charInfo = getCharacterInfo();
            posterName = charInfo.name;
            posterAvatar = charInfo.avatar;
            posterPersonality = charInfo.personality;
        }

        const recentContext = getRecentChatContext();
        console.log(` [Instagram] ${posterName}님이 게시물을 올리는 중...`);

        try {
            const prompt = INSTAGRAM_PROMPTS.characterPost(posterName, posterPersonality, recentContext);
            const caption = await generateWithAI(prompt, 200);
            if (caption && caption.trim()) {
                const cleanCaption = caption.replace(/^["']|["']$/g, '').trim();
                let imageUrl = null;
                try {
                    const imagePrompt = await generateImagePrompt(`${posterName} taking a selfie or photo, ${cleanCaption}`);
                    imageUrl = await generateImage(imagePrompt);
                } catch (imgErr) { console.warn('[Instagram] 이미지 생성 스킵:', imgErr); }

                const newPost = {
                    id: Date.now(), author: posterName, authorAvatar: posterAvatar, imageUrl: imageUrl,
                    caption: cleanCaption, timestamp: Date.now(), likes: Math.floor(Math.random() * 50) + 10,
                    likedByUser: false, comments: [], isUser: false
                };
                posts.unshift(newPost);
                debouncedSavePosts();
                addHiddenLog(posterName, `[ Instagram] ${posterName}님이 새 게시물을 올렸습니다: "${cleanCaption}"`);
                toastr.success(` ${posterName}님이 인스타그램에 새 게시물을 올렸습니다!`);
                
                // 앱이 열려있으면 새로고침
                if ($('.st-insta-app').length > 0) renderTab('feed');
            }
        } catch (e) { console.error('[Instagram] 캐릭터 게시물 생성 실패:', e); }
        finally { isGeneratingPost = false; }
    }

    // ========== 선제 포스트 시스템 (messages.js의 선톡 시스템 참고) ==========
    async function checkProactivePost(charName) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        console.debug(' [Instagram Proactive] check start', { charName, enabled: !!settings.instagramPostEnabled, isGeneratingPost });

        // 설정에서 인스타그램 선제 포스트 활성화 확인 (기본값: true)
        if (settings.instagramPostEnabled === false) {
            console.debug(' [Instagram Proactive] disabled');
            return;
        }

        // 쿨다운 체크
        const sinceLast = Date.now() - lastProactivePostCheck;
        if (sinceLast < PROACTIVE_POST_COOLDOWN) {
            console.debug(' [Instagram Proactive] cooldown', { sinceLast, cooldown: PROACTIVE_POST_COOLDOWN });
            return;
        }

        if (isGeneratingPost) {
            console.debug(' [Instagram Proactive] blocked by isGeneratingPost');
            return;
        }

        // 확률 체크 (기본값 15%)
        const chance = settings.instagramPostChance || 15;
        const roll = Math.random() * 100;
        console.debug(' [Instagram Proactive] roll', { roll: Number(roll.toFixed(2)), chance });

        if (roll > chance) {
            console.log(` [Instagram Proactive] 확률 미달 (${roll.toFixed(0)}% > ${chance}%)`);
            return;
        }

        lastProactivePostCheck = Date.now();
        console.log(` [Instagram Proactive] ${charName || '캐릭터'}님이 인스타그램 포스트 생성!`);
        await generateCharacterPost(charName);
    }

    // ========== 선제 포스트 리스너 초기화 (messages.js 참고) ==========
    function initProactivePostListener() {
        console.log(' [Instagram] initProactivePostListener 시작');
        const checkInterval = setInterval(() => {
            const ctx = window.SillyTavern?.getContext?.();
            console.log(' [Instagram] context 체크', { hasCtx: !!ctx });
            if (!ctx) return;

            clearInterval(checkInterval);
            const eventSource = ctx.eventSource;
            const eventTypes = ctx.eventTypes;
            console.log(' [Instagram] eventSource/eventTypes 체크', {
                hasEventSource: !!eventSource, hasEventTypes: !!eventTypes,
                MESSAGE_RECEIVED: eventTypes?.MESSAGE_RECEIVED
            });

            if (eventSource && eventTypes) {
                eventSource.on(eventTypes.MESSAGE_RECEIVED, (messageId) => {
                    console.log(' [Instagram] MESSAGE_RECEIVED 이벤트 발생!', { messageId });
                    setTimeout(() => {
                        const ctx = window.SillyTavern.getContext();
                        if (!ctx.chat || ctx.chat.length === 0) return;
                        const userMsgCount = ctx.chat.reduce((count, m) => count + (m?.is_user ? 1 : 0), 0);
                        if (userMsgCount === 0) { console.log(' [Instagram] 그리팅/초기 메시지 스킵'); return; }
                        const lastMsg = ctx.chat[ctx.chat.length - 1];
                        if (lastMsg && !lastMsg.is_user) {
                            checkProactivePost(lastMsg.name);
                        }
                    }, 1000);
                });
                console.log(' [Instagram] 채팅 이벤트 리스너 등록 완료!');
            } else if (eventSource) {
                eventSource.on('message_received', (messageId) => {
                    setTimeout(() => {
                        const ctx = window.SillyTavern.getContext();
                        if (!ctx.chat || ctx.chat.length === 0) return;
                        const userMsgCount = ctx.chat.reduce((count, m) => count + (m?.is_user ? 1 : 0), 0);
                        if (userMsgCount === 0) return;
                        const lastMsg = ctx.chat[ctx.chat.length - 1];
                        if (lastMsg && !lastMsg.is_user) checkProactivePost(lastMsg.name);
                    }, 1000);
                });
                console.log(' [Instagram] 채팅 이벤트 리스너 등록됨 (폴백)');
            } else {
                console.warn(' [Instagram] eventSource missing');
            }
        }, 1000);
    }

    // 3초 후 선제 포스트 리스너 초기화
    setTimeout(initProactivePostListener, 3000);

    // ========== 게시물 삭제 ==========
    function deletePost(postId) {
        const idx = posts.findIndex(p => p.id === postId);
        if (idx === -1) return;
        posts.splice(idx, 1);
        debouncedSavePosts();
        const userName = getUserName();
        addHiddenLog(userName, `[ Instagram] ${userName}님이 게시물을 삭제했습니다.`);
        toastr.info('게시물이 삭제되었습니다');
        renderTab(currentTab);
    }

    // ========== 게시물 상세 보기 ==========
    function openPostDetail(postId) {
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const $app = $('.st-insta-app');

        let commentsHtml = '';
        if (post.comments && post.comments.length > 0) {
            commentsHtml = post.comments.map(c => `
                <div class="st-insta-comment">
                    <img src="${c.authorAvatar || DEFAULT_AVATAR}" class="st-insta-comment-avatar">
                    <div class="st-insta-comment-content">
                        <div><strong>${c.author}</strong>${c.replyTo ? `<span style="color:#8e8e8e">@${c.replyTo}</span> ` : ''}${c.text}</div>
                        <div class="st-insta-comment-time">${formatTime(c.timestamp)}</div>
                    </div>
                </div>
            `).join('');
        } else {
            commentsHtml = '<div class="st-insta-empty" style="padding:40px;"><div>아직 댓글이 없습니다</div></div>';
        }

        const detailHtml = `
            <div class="st-insta-post-detail" id="st-insta-detail">
                <div class="st-insta-detail-header">
                    <div class="st-insta-detail-back" id="st-insta-detail-close"></div>
                    <div class="st-insta-detail-title">댓글</div>
                </div>
                <div class="st-insta-detail-content">
                    <div class="st-insta-post-header">
                        <img src="${post.authorAvatar || DEFAULT_AVATAR}" class="st-insta-post-avatar">
                        <div class="st-insta-post-user"><div class="st-insta-post-username">${post.author}</div></div>
                    </div>
                    ${post.caption ? `
                        <div class="st-insta-post-caption" style="padding:12px 14px;border-bottom:1px solid var(--pt-border,#dbdbdb);">
                            <strong>${post.author}</strong>${post.caption}
                            <div class="st-insta-post-time" style="padding:8px 0 0;">${formatTime(post.timestamp)}</div>
                        </div>
                    ` : ''}
                    <div class="st-insta-comments" style="padding:12px 14px;" data-post-id="${post.id}">${commentsHtml}</div>
                </div>
                <div class="st-insta-comment-input-wrap">
                    <input type="text" class="st-insta-comment-input" placeholder="댓글 달기..." data-post-id="${post.id}" id="st-insta-detail-input">
                    <button class="st-insta-comment-post" data-post-id="${post.id}" id="st-insta-detail-post" disabled>게시</button>
                </div>
            </div>
        `;

        $app.append(detailHtml);
        $('#st-insta-detail-close').on('click', () => { $('#st-insta-detail').remove(); renderTab('feed'); });
        $('#st-insta-detail-input').on('input', function() {
            const hasText = $(this).val().trim().length > 0;
            $('#st-insta-detail-post').prop('disabled', !hasText);
        });
        $('#st-insta-detail-post').on('click', async function() {
            const text = $('#st-insta-detail-input').val().trim();
            if (text) { await addComment(postId, text, true); $('#st-insta-detail').remove(); openPostDetail(postId); }
        });
        $('#st-insta-detail-input').on('keypress', function(e) { if (e.which === 13) $('#st-insta-detail-post').click(); });
    }

    // ========== 외부 인터페이스 ==========
    return {
        open,
        createPost,
        generateCharacterPost,
        checkProactivePost,
        addHiddenLog
    };
})();
