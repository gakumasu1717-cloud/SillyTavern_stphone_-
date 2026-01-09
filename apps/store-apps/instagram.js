/**
 * ST Phone System - Instagram App
 * AI 기반 프로액티브 포스팅, 댓글, 좋아요 시스템
 */

window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

console.log('📸 [Instagram] 모듈 로딩 시작...');

window.STPhone.Apps.Instagram = (function() {
    'use strict';

    console.log('📸 [Instagram] IIFE 실행 중...');

    const STORAGE_KEY = 'stphone_instagram_posts';
    let posts = [];
    let isGeneratingPost = false;
    let currentView = 'feed'; // 'feed', 'create', 'profile'

    // ========== CSS 스타일 ==========
    const css = `
        <style>
            .st-insta-app {
                position: absolute; top: 0; left: 0;
                width: 100%; height: 100%; z-index: 999;
                display: flex; flex-direction: column;
                background: var(--pt-bg-color, #fafafa);
                color: var(--pt-text-color, #262626);
                font-family: var(--pt-font, -apple-system, sans-serif);
                overflow: hidden;
            }
            .st-insta-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid var(--pt-border, #dbdbdb);
                background: var(--pt-card-bg, #fff);
                flex-shrink: 0;
            }
            .st-insta-logo {
                font-family: 'Billabong', cursive, sans-serif;
                font-size: 24px;
                font-weight: 400;
            }
            .st-insta-header-icons {
                display: flex;
                gap: 18px;
                font-size: 22px;
            }
            .st-insta-header-icon {
                cursor: pointer;
                opacity: 0.8;
                transition: opacity 0.2s;
            }
            .st-insta-header-icon:hover { opacity: 1; }
            
            .st-insta-feed {
                flex: 1;
                overflow-y: auto;
                overflow-x: hidden;
                padding-bottom: 60px;
                -webkit-overflow-scrolling: touch;
            }
            .st-insta-feed::-webkit-scrollbar {
                width: 4px;
            }
            .st-insta-feed::-webkit-scrollbar-thumb {
                background: rgba(0,0,0,0.2);
                border-radius: 2px;
            }
            
            /* FAB 버튼 */
            .st-insta-fab {
                position: absolute;
                bottom: 80px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, rgba(245,133,41,0.85), rgba(221,42,123,0.85), rgba(129,52,175,0.85));
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 1000;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .st-insta-fab:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            .st-insta-fab:active {
                transform: scale(0.95);
            }
            
            /* 스토리 영역 */
            .st-insta-stories {
                display: flex;
                gap: 12px;
                padding: 12px 16px;
                overflow-x: auto;
                border-bottom: 1px solid var(--pt-border, #dbdbdb);
                background: var(--pt-card-bg, #fff);
            }
            .st-insta-stories::-webkit-scrollbar { display: none; }
            .st-insta-story {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                flex-shrink: 0;
            }
            .st-insta-story-avatar {
                width: 56px; height: 56px;
                border-radius: 50%;
                padding: 2px;
                background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
            }
            .st-insta-story-avatar img {
                width: 100%; height: 100%;
                border-radius: 50%;
                border: 2px solid var(--pt-card-bg, #fff);
                object-fit: cover;
            }
            .st-insta-story-name {
                font-size: 11px;
                color: var(--pt-sub-text, #8e8e8e);
                max-width: 60px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            /* 포스트 카드 */
            .st-insta-post {
                background: var(--pt-card-bg, #fff);
                border-bottom: 1px solid var(--pt-border, #efefef);
                margin-bottom: 8px;
            }
            .st-insta-post-header {
                display: flex;
                align-items: center;
                padding: 12px 14px;
                gap: 10px;
            }
            .st-insta-post-avatar {
                width: 32px; height: 32px;
                border-radius: 50%;
                object-fit: cover;
            }
            .st-insta-post-author {
                flex: 1;
                font-weight: 600;
                font-size: 14px;
            }
            .st-insta-post-more {
                font-size: 16px;
                cursor: pointer;
                padding: 5px;
            }
            .st-insta-post-image {
                width: 100%;
                aspect-ratio: 1;
                object-fit: cover;
                background: #f0f0f0;
            }
            .st-insta-post-actions {
                display: flex;
                align-items: center;
                padding: 10px 14px;
                gap: 16px;
                font-size: 22px;
            }
            .st-insta-post-action {
                cursor: pointer;
                transition: transform 0.1s;
            }
            .st-insta-post-action:active { transform: scale(0.9); }
            .st-insta-post-action.liked { color: #ed4956; }
            .st-insta-post-bookmark {
                margin-left: auto;
            }
            .st-insta-post-likes {
                padding: 0 14px;
                font-weight: 600;
                font-size: 14px;
            }
            .st-insta-post-caption {
                padding: 6px 14px 8px;
                font-size: 14px;
                line-height: 1.4;
            }
            .st-insta-post-caption strong {
                font-weight: 600;
                margin-right: 5px;
            }
            .st-insta-post-comments {
                padding: 4px 14px 8px;
                font-size: 13px;
                color: var(--pt-sub-text, #8e8e8e);
                cursor: pointer;
            }
            .st-insta-post-time {
                padding: 0 14px 12px;
                font-size: 10px;
                color: var(--pt-sub-text, #8e8e8e);
                text-transform: uppercase;
            }
            .st-insta-comment-input {
                display: flex;
                align-items: center;
                padding: 10px 14px;
                gap: 12px;
                border-top: 1px solid var(--pt-border, #efefef);
            }
            .st-insta-comment-input input {
                flex: 1;
                border: none;
                background: transparent;
                font-size: 14px;
                outline: none;
                color: var(--pt-text-color, #262626);
            }
            .st-insta-comment-input input::placeholder {
                color: var(--pt-sub-text, #8e8e8e);
            }
            .st-insta-comment-btn {
                color: #0095f6;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                opacity: 0.5;
                transition: opacity 0.2s;
            }
            .st-insta-comment-btn.active { opacity: 1; }
            
            /* 댓글 리스트 */
            .st-insta-comments-list {
                padding: 0 14px 10px;
            }
            .st-insta-comment-item {
                display: flex;
                gap: 10px;
                padding: 6px 0;
                font-size: 13px;
                line-height: 1.4;
            }
            .st-insta-comment-avatar {
                width: 28px; height: 28px;
                border-radius: 50%;
                object-fit: cover;
                flex-shrink: 0;
            }
            .st-insta-comment-content {
                flex: 1;
            }
            .st-insta-comment-author {
                font-weight: 600;
                margin-right: 5px;
            }
            
            /* 포스트 생성 화면 */
            .st-insta-create {
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: var(--pt-bg-color, #fafafa);
                display: flex;
                flex-direction: column;
                z-index: 1001;
            }
            .st-insta-create-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 14px 16px;
                border-bottom: 1px solid var(--pt-border, #dbdbdb);
                background: var(--pt-card-bg, #fff);
            }
            .st-insta-create-cancel {
                font-size: 16px;
                cursor: pointer;
            }
            .st-insta-create-title {
                font-weight: 600;
                font-size: 16px;
            }
            .st-insta-create-next {
                color: #0095f6;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
            }
            .st-insta-create-next.disabled {
                opacity: 0.4;
                pointer-events: none;
            }
            .st-insta-create-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                padding: 16px;
                gap: 16px;
            }
            .st-insta-create-preview {
                width: 100%;
                aspect-ratio: 1;
                background: #f0f0f0;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--pt-sub-text, #8e8e8e);
                font-size: 48px;
                overflow: hidden;
            }
            .st-insta-create-preview img {
                width: 100%; height: 100%;
                object-fit: cover;
            }
            .st-insta-create-prompt {
                width: 100%;
                padding: 14px;
                border: 1px solid var(--pt-border, #dbdbdb);
                border-radius: 8px;
                font-size: 14px;
                resize: none;
                min-height: 80px;
                outline: none;
                background: var(--pt-card-bg, #fff);
                color: var(--pt-text-color, #262626);
            }
            .st-insta-create-prompt::placeholder {
                color: var(--pt-sub-text, #8e8e8e);
            }
            .st-insta-create-caption {
                width: 100%;
                padding: 14px;
                border: 1px solid var(--pt-border, #dbdbdb);
                border-radius: 8px;
                font-size: 14px;
                resize: none;
                min-height: 60px;
                outline: none;
                background: var(--pt-card-bg, #fff);
                color: var(--pt-text-color, #262626);
            }
            .st-insta-create-caption::placeholder {
                color: var(--pt-sub-text, #8e8e8e);
            }
            .st-insta-create-btn {
                padding: 14px;
                background: #0095f6;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: opacity 0.2s;
            }
            .st-insta-create-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .st-insta-create-btn:hover:not(:disabled) {
                opacity: 0.9;
            }
            
            /* 로딩 */
            .st-insta-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 40px;
            }
            .st-insta-spinner {
                width: 36px; height: 36px;
                border: 3px solid var(--pt-border, #dbdbdb);
                border-top-color: #0095f6;
                border-radius: 50%;
                animation: insta-spin 0.8s linear infinite;
            }
            @keyframes insta-spin {
                to { transform: rotate(360deg); }
            }
            
            /* 빈 피드 */
            .st-insta-empty {
                text-align: center;
                padding: 60px 40px;
                color: var(--pt-sub-text, #8e8e8e);
            }
            .st-insta-empty-icon {
                font-size: 64px;
                margin-bottom: 16px;
                opacity: 0.5;
            }
            .st-insta-empty-title {
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 8px;
                color: var(--pt-text-color, #262626);
            }
            
            /* 프로필 화면 */
            .st-insta-profile {
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: var(--pt-bg-color, #fafafa);
                display: flex;
                flex-direction: column;
                z-index: 1001;
            }
            .st-insta-profile-header {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                gap: 12px;
                border-bottom: 1px solid var(--pt-border, #dbdbdb);
                background: var(--pt-card-bg, #fff);
            }
            .st-insta-profile-back {
                font-size: 22px;
                cursor: pointer;
            }
            .st-insta-profile-name {
                flex: 1;
                font-weight: 600;
                font-size: 18px;
            }
            .st-insta-profile-content {
                flex: 1;
                overflow-y: auto;
            }
            .st-insta-profile-info {
                display: flex;
                align-items: center;
                padding: 20px;
                gap: 24px;
            }
            .st-insta-profile-avatar {
                width: 86px; height: 86px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid var(--pt-border, #dbdbdb);
            }
            .st-insta-profile-stats {
                display: flex;
                gap: 24px;
            }
            .st-insta-profile-stat {
                text-align: center;
            }
            .st-insta-profile-stat-num {
                font-weight: 700;
                font-size: 18px;
            }
            .st-insta-profile-stat-label {
                font-size: 13px;
                color: var(--pt-sub-text, #8e8e8e);
            }
            .st-insta-profile-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 2px;
                padding: 2px;
            }
            .st-insta-profile-grid-item {
                aspect-ratio: 1;
                cursor: pointer;
            }
            .st-insta-profile-grid-item img {
                width: 100%; height: 100%;
                object-fit: cover;
            }
        </style>
    `;

    // ========== 기본 프롬프트 ==========
    const DEFAULT_PROMPTS = {
        // 댓글 관련 프롬프트만 유지 (통합 프롬프트는 generatePostAllInOne에서 직접 처리)
        commentContextCheck: `Would {{char}} comment on this post by {{postAuthor}}?
Caption: "{{postCaption}}"
Relationship: {{relationship}}
Answer YES or NO.`,

        characterComment: `You are {{char}} commenting on {{postAuthor}}'s post.
Caption: "{{postCaption}}"
Relationship: {{relationship}}
Write a short comment (1-2 sentences, in Korean).
Output ONLY the comment text, no quotes.`
    };

    // ========== 유틸리티 함수 ==========
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getStorageKey() {
        const context = window.SillyTavern?.getContext?.();
        if (!context?.chatId) return null;

        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        if (settings.recordMode === 'accumulate' && context.characterId !== undefined) {
            return STORAGE_KEY + '_char_' + context.characterId;
        }
        return STORAGE_KEY + '_' + context.chatId;
    }

    function loadPosts() {
        const key = getStorageKey();
        if (!key) {
            posts = [];
            return;
        }
        try {
            const saved = localStorage.getItem(key);
            posts = saved ? JSON.parse(saved) : [];
        } catch (e) {
            posts = [];
        }
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

    function getPrompt(key) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        
        // 댓글 생성 프롬프트 - settings에서 가져오거나 기본값 사용
        if (key === 'characterComment') {
            return settings.instaCommentPrompt || DEFAULT_PROMPTS.characterComment;
        }
        
        // 나머지는 기본값 사용
        return DEFAULT_PROMPTS[key] || '';
    }

    function fillPrompt(template, vars) {
        let result = template;
        for (const [k, v] of Object.entries(vars)) {
            result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'gi'), v || '');
        }
        return result;
    }

    // ========== 캘린더 연동 ==========
    function getCalendarInfo() {
        const Calendar = window.STPhone.Apps?.Calendar;
        const Store = window.STPhone.Apps?.Store;
        
        // 캘린더 앱이 설치되어 있고 활성화되어 있는지 확인
        if (!Store?.isInstalled?.('calendar') || !Calendar?.isCalendarEnabled?.()) {
            return null;
        }
        
        const rpDate = Calendar.getRpDate?.();
        if (!rpDate) return null;
        
        const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        const dateObj = new Date(rpDate.year, rpDate.month - 1, rpDate.day);
        const dayOfWeek = dayNames[dateObj.getDay()];
        
        return {
            year: rpDate.year,
            month: rpDate.month,
            day: rpDate.day,
            dayOfWeek,
            formatted: `${rpDate.year}년 ${rpDate.month}월 ${rpDate.day}일 ${dayOfWeek}`,
            timestamp: dateObj.getTime()
        };
    }

    function getRpTimestamp() {
        const calInfo = getCalendarInfo();
        if (calInfo) {
            // RP 날짜 기준 현재 시간으로 타임스탬프 생성
            const now = new Date();
            const rpDate = new Date(calInfo.year, calInfo.month - 1, calInfo.day, 
                now.getHours(), now.getMinutes(), now.getSeconds());
            return rpDate.getTime();
        }
        return Date.now();
    }

    function getRecentChatContext(maxMessages = 15) {
        const ctx = window.SillyTavern?.getContext?.();
        if (!ctx?.chat) return '';
        
        const recent = ctx.chat.slice(-maxMessages);
        return recent.map(m => {
            const sender = m.is_user ? 'User' : m.name;
            return `${sender}: ${m.mes}`;
        }).join('\n');
    }

    function getCharacterInfo() {
        const ctx = window.SillyTavern?.getContext?.();
        if (!ctx) return { name: 'Character', personality: '' };
        
        const charName = ctx.name2 || ctx.characters?.[ctx.characterId]?.name || 'Character';
        const charData = ctx.characters?.[ctx.characterId] || {};
        const personality = charData.personality || charData.description || '';
        
        return { name: charName, personality };
    }

    function getContactByName(name) {
        const contacts = window.STPhone.Apps?.Contacts?.getAllContacts?.() || [];
        return contacts.find(c => c?.name?.toLowerCase() === name?.toLowerCase());
    }

    function getUserInfo() {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        return {
            name: settings.userName || 'User',
            avatar: settings.userAvatar || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'
        };
    }

    function getContactAvatar(name) {
        const contact = getContactByName(name);
        if (contact?.avatar) return contact.avatar;
        
        // 캐릭터 아바타
        const ctx = window.SillyTavern?.getContext?.();
        if (ctx?.characters) {
            for (const char of ctx.characters) {
                if (char?.name?.toLowerCase() === name?.toLowerCase() && char?.avatar) {
                    return `/characters/${encodeURIComponent(char.avatar)}`;
                }
            }
        }
        
        return 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
    }

    function formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        if (days < 7) return `${days}일 전`;
        return new Date(timestamp).toLocaleDateString('ko-KR');
    }

    // ========== AI 생성 함수 ==========
    function normalizeModelOutput(raw) {
        if (raw == null) return '';
        if (typeof raw === 'string') return raw;
        if (typeof raw?.content === 'string') return raw.content;
        if (typeof raw?.text === 'string') return raw.text;
        const choiceContent = raw?.choices?.[0]?.message?.content;
        if (typeof choiceContent === 'string') return choiceContent;
        try { return JSON.stringify(raw); } catch { return String(raw); }
    }

    async function generateWithAI(prompt, maxTokens = 150) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        const profileId = settings.connectionProfileId;

        try {
            const context = window.SillyTavern?.getContext?.();
            if (!context) throw new Error('SillyTavern context not available');

            // Connection Profile 사용 (우선)
            if (profileId) {
                const connectionManager = context.ConnectionManagerRequestService;
                if (connectionManager && typeof connectionManager.sendRequest === 'function') {
                    console.log('[Instagram] ConnectionManager로 AI 호출...');
                    const result = await connectionManager.sendRequest(
                        profileId,
                        [{ role: 'user', content: prompt }],
                        maxTokens,
                        {},
                        { max_tokens: maxTokens }
                    );
                    const output = normalizeModelOutput(result).trim();
                    console.log('[Instagram] AI 응답:', output.substring(0, 100) + '...');
                    return output;
                }
            }

            // Fallback: genraw (quiet 모드로 채팅에 안 보이게)
            const parser = context.SlashCommandParser || window.SlashCommandParser;
            const genCmd = parser?.commands?.['genraw'];
            if (genCmd?.callback) {
                console.log('[Instagram] genraw로 AI 호출...');
                const result = await genCmd.callback({ quiet: true, hidden: true }, prompt);
                const output = String(result || '').trim();
                console.log('[Instagram] AI 응답:', output.substring(0, 100) + '...');
                return output;
            }

            console.warn('[Instagram] AI 호출 방법 없음');
            return null;
        } catch (e) {
            console.error('[Instagram] AI 생성 실패:', e);
            return null;
        }
    }

    async function generateDetailedPrompt(userInput, characterName) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        const cameraPromptTemplate = settings.cameraPrompt || `[System] You are an expert image prompt generator.
Convert the user's description into a detailed image generation prompt.
Output ONLY a single <pic prompt="..."> tag, nothing else.`;

        const contact = getContactByName(characterName);
        const visualTags = contact?.tags || '';

        // Visual Tag Library 구성
        const user = getUserInfo();
        const userTags = settings.userTags || '';
        let visualLibrary = `### Visual Tag Library\n`;
        visualLibrary += `1. [${user.name} (User)]: ${userTags}\n`;

        const allContacts = window.STPhone.Apps?.Contacts?.getAllContacts?.() || [];
        let lineNumber = 2;
        for (const c of allContacts) {
            if (c?.name && c?.tags) {
                visualLibrary += `${lineNumber}. [${c.name}]: ${c.tags}\n`;
                lineNumber++;
            }
        }

        const aiInstruction = `${cameraPromptTemplate}

${visualLibrary}

### Task
User's request: "${userInput}"
Based on the Library, identify characters and use their tags.

Example output format:
<pic prompt="tags, comma, separated">`;

        try {
            const result = await generateWithAI(aiInstruction, 200);
            const regex = /<pic[^>]*\sprompt="([^"]*)"[^>]*?>/i;
            const match = String(result || '').match(regex);
            
            if (match && match[1]?.trim()) {
                return match[1];
            }
        } catch (e) {
            console.warn('[Instagram] AI 프롬프트 생성 실패:', e);
        }

        return userInput;
    }

    // ========== 카메라 앱 방식 그대로 ==========
    function getSlashCommandParser() {
        if (window.SlashCommandParser && window.SlashCommandParser.commands) {
            return window.SlashCommandParser;
        }
        
        if (window.SillyTavern) {
            const ctx = typeof window.SillyTavern.getContext === 'function' 
                ? window.SillyTavern.getContext() 
                : window.SillyTavern;
            
            if (ctx && ctx.SlashCommandParser && ctx.SlashCommandParser.commands) {
                return ctx.SlashCommandParser;
            }
        }

        if (typeof SlashCommandParser !== 'undefined' && SlashCommandParser.commands) {
            return SlashCommandParser;
        }

        return null;
    }

    function getExecuteSlashCommand() {
        if (window.SillyTavern) {
            const ctx = typeof window.SillyTavern.getContext === 'function' 
                ? window.SillyTavern.getContext() 
                : window.SillyTavern;
            
            if (ctx && typeof ctx.executeSlashCommands === 'function') {
                return ctx.executeSlashCommands;
            }
            if (ctx && typeof ctx.executeSlashCommand === 'function') {
                return ctx.executeSlashCommand;
            }
        }

        if (typeof executeSlashCommands === 'function') {
            return executeSlashCommands;
        }
        if (typeof executeSlashCommand === 'function') {
            return executeSlashCommand;
        }

        return null;
    }

    async function generateImage(prompt) {
        const parser = getSlashCommandParser();
        if (parser && parser.commands) {
            const sdCmd = parser.commands['sd'] || parser.commands['draw'] || parser.commands['imagine'];
            if (sdCmd && typeof sdCmd.callback === 'function') {
                try {
                    const result = await sdCmd.callback({ quiet: 'true' }, prompt);
                    if (result && typeof result === 'string') {
                        return result;
                    }
                } catch (e) {
                    console.warn("[Instagram] sd.callback 실패:", e);
                }
            }
        }

        const executeCmd = getExecuteSlashCommand();
        if (executeCmd) {
            try {
                const result = await executeCmd(`/sd quiet=true ${prompt}`);
                if (result && result.pipe) {
                    return result.pipe;
                }
                if (typeof result === 'string') {
                    return result;
                }
            } catch (e) {
                console.warn("[Instagram] executeSlashCommands 실패:", e);
            }
        }

        throw new Error("이미지 생성 실패");
    }

    // ========== 통합 AI 호출 (3회 → 1회) ==========
    async function generatePostAllInOne(charName, personality) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        const context = getRecentChatContext();
        const contact = getContactByName(charName);
        const visualTags = contact?.tags || '';
        
        // 캘린더 정보 가져오기
        const calInfo = getCalendarInfo();
        const currentDate = calInfo?.formatted || new Date().toLocaleDateString('ko-KR');
        
        // 기념일 정보 가져오기
        let eventsInfo = '';
        const Calendar = window.STPhone.Apps?.Calendar;
        if (Calendar?.getEventsOnlyPrompt) {
            const eventsPrompt = Calendar.getEventsOnlyPrompt();
            if (eventsPrompt) {
                eventsInfo = '\n\n' + eventsPrompt;
            }
        }
        
        // settings에서 템플릿 가져오기, 없으면 기본값 사용
        let promptTemplate = settings.instaAllInOnePrompt || `You are {{charName}}. Based on the recent chat context, decide if you would post on Instagram right now.

### Current Date
{{currentDate}}{{eventsInfo}}

### Context
{{context}}

### Your personality
{{personality}}

### Your visual tags for image generation
{{visualTags}}

### Task
Respond in JSON format ONLY:
{
    "shouldPost": true or false,
    "caption": "Short casual caption in Korean (1-2 sentences, NO hashtags)",
    "imagePrompt": "detailed SD prompt in English: subject, pose, setting, lighting, style tags"
}

If the situation is not suitable for posting, set shouldPost to false.`;

        // 플레이스홀더 치환
        const prompt = promptTemplate
            .replace(/\{\{charName\}\}/g, charName)
            .replace(/\{\{currentDate\}\}/g, currentDate)
            .replace(/\{\{eventsInfo\}\}/g, eventsInfo)
            .replace(/\{\{context\}\}/g, context)
            .replace(/\{\{personality\}\}/g, personality)
            .replace(/\{\{visualTags\}\}/g, visualTags);

        try {
            const result = await generateWithAI(prompt, 400);
            const jsonMatch = String(result || '').match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    shouldPost: !!parsed.shouldPost,
                    caption: parsed.caption || '',
                    imagePrompt: parsed.imagePrompt || ''
                };
            }
        } catch (e) {
            console.warn('[Instagram] 통합 AI 호출 실패:', e);
        }
        
        return { shouldPost: false, caption: null, imagePrompt: null };
    }

    // ========== 프로액티브 포스트 ==========
    async function checkProactivePost(charName) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        
        console.log(`📸 [Instagram] checkProactivePost 호출됨: ${charName}`);
        console.log(`📸 [Instagram] 설정 - enabled: ${settings.instagramPostEnabled}, chance: ${settings.instagramPostChance}%`);
        
        if (settings.instagramPostEnabled === false) {
            console.log('📸 [Instagram] 포스팅 비활성화됨');
            return;
        }
        if (isGeneratingPost) {
            console.log('📸 [Instagram] 이미 생성 중...');
            return;
        }
        
        // 확률 체크 (기본 15%)
        const chance = settings.instagramPostChance || 15;
        const roll = Math.random() * 100;
        console.log(`📸 [Instagram] 확률 체크: ${roll.toFixed(1)} <= ${chance}?`);
        if (roll > chance) {
            console.log('📸 [Instagram] 확률 체크 실패, 스킵');
            return;
        }
        console.log('📸 [Instagram] 확률 체크 통과! AI 호출 시작...');

        const contact = getContactByName(charName);
        const charInfo = getCharacterInfo();
        const personality = contact?.personality || charInfo.personality || '';

        console.log(`📸 [Instagram] ${charName}의 프로액티브 포스트 체크...`);

        isGeneratingPost = true;
        
        try {
            const result = await generatePostAllInOne(charName, personality);
            console.log(`📸 [Instagram] AI 결과:`, JSON.stringify(result));
            
            if (!result.shouldPost) {
                console.log(`📸 [Instagram] ${charName} 포스팅 조건 불충족 (AI가 shouldPost: false 반환)`);
                return;
            }
            console.log(`📸 [Instagram] 포스팅 진행! 캡션: ${result.caption}`);

            // 이미지 생성 (AI 프롬프트 상세화 거침)
            console.log(`📸 [Instagram] ${charName}의 이미지 생성 중...`);
            let imageUrl = null;
            
            if (result.imagePrompt) {
                try {
                    // 카메라/메신저와 동일하게 AI 프롬프트 상세화 적용
                    const detailedPrompt = await generateDetailedPrompt(result.imagePrompt, charName);
                    console.log(`📸 [Instagram] 상세화된 프롬프트:`, detailedPrompt);
                    imageUrl = await generateImage(detailedPrompt);
                } catch (e) {
                    console.warn('[Instagram] 이미지 생성 실패:', e);
                }
            }

            // 게시물 추가
            loadPosts();
            const newPost = {
                id: Date.now(),
                author: charName,
                authorAvatar: getContactAvatar(charName),
                imageUrl: imageUrl || '',
                caption: result.caption,
                timestamp: getRpTimestamp(),
                likes: Math.floor(Math.random() * 50) + 10,
                likedByUser: false,
                comments: [],
                isUser: false
            };

            posts.unshift(newPost);
            savePosts();

            addHiddenLog(charName, `[Instagram 포스팅] ${charName}가 Instagram에 게시물을 올렸습니다: "${result.caption}"`);
            console.log(`📸 [Instagram] ${charName} 게시물 완료!`);
            
        } finally {
            isGeneratingPost = false;
        }
    }

    async function generateCharacterPost(charName, preGeneratedCaption = null) {
        if (isGeneratingPost) return;
        isGeneratingPost = true;

        try {
            loadPosts();
            
            const charInfo = getCharacterInfo();
            const posterName = charName || charInfo.name;
            const contact = getContactByName(posterName);
            const personality = contact?.personality || charInfo.personality || '';

            // 캡션이 없으면 생성
            let caption = preGeneratedCaption;
            if (!caption) {
                const context = getRecentChatContext();
                const template = getPrompt('characterPost');
                const prompt = fillPrompt(template, { 
                    context, 
                    char: posterName, 
                    personality 
                });
                caption = await generateWithAI(prompt, 150);
            }

            if (!caption?.trim()) {
                console.warn('[Instagram] 캡션 생성 실패');
                return;
            }

            // 이미지 생성
            console.log(`📸 [Instagram] ${posterName}의 이미지 생성 중...`);
            const detailedPrompt = await generateDetailedPrompt(
                `${posterName} selfie for Instagram, ${caption}`,
                posterName
            );
            const imageUrl = await generateImage(detailedPrompt);

            if (!imageUrl) {
                console.warn('[Instagram] 이미지 생성 실패');
                // 이미지 없이도 포스팅 가능
            }

            // 포스트 저장
            const newPost = {
                id: Date.now(),
                author: posterName,
                authorAvatar: getContactAvatar(posterName),
                imageUrl: imageUrl || 'https://via.placeholder.com/400x400?text=Photo',
                caption: caption.trim(),
                timestamp: getRpTimestamp(),
                likes: Math.floor(Math.random() * 50) + 10,
                likedByUser: false,
                comments: [],
                isUser: false
            };

            posts.unshift(newPost);
            savePosts();

            console.log(`📸 [Instagram] ${posterName}의 포스트 생성 완료:`, caption);

            // 히든 로그 추가 (채팅 맥락에 반영)
            addHiddenLog(posterName, `[Instagram 포스팅] ${posterName}가 Instagram에 게시물을 올렸습니다: "${caption}"`);

            // 토스트 알림
            if (window.toastr) {
                toastr.info(`📸 ${posterName}님이 Instagram에 새 게시물을 올렸습니다`, 'Instagram');
            }

        } catch (e) {
            console.error('[Instagram] 포스트 생성 실패:', e);
        } finally {
            isGeneratingPost = false;
        }
    }

    // ========== 댓글 시스템 ==========
    async function checkAndGenerateComment(postId, charName) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        
        loadPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        // 자신의 게시물에는 댓글 안 함
        if (post.author.toLowerCase() === charName.toLowerCase()) return;

        // 이미 댓글을 남겼는지 확인
        const alreadyCommented = post.comments.some(
            c => c.author.toLowerCase() === charName.toLowerCase()
        );
        if (alreadyCommented) return;

        const contact = getContactByName(charName);
        const relationship = contact?.relationship || 'friend';

        // 맥락 체크
        const contextTemplate = getPrompt('commentContextCheck');
        const contextPrompt = fillPrompt(contextTemplate, {
            char: charName,
            postAuthor: post.author,
            postCaption: post.caption,
            relationship
        });

        const shouldComment = await generateWithAI(contextPrompt, 10);
        if (!shouldComment?.toUpperCase().includes('YES')) return;

        // 댓글 생성
        const commentTemplate = getPrompt('characterComment');
        const commentPrompt = fillPrompt(commentTemplate, {
            char: charName,
            postAuthor: post.author,
            postCaption: post.caption,
            relationship
        });

        const comment = await generateWithAI(commentPrompt, 100);
        if (!comment?.trim()) return;

        // 댓글 추가
        post.comments.push({
            id: Date.now(),
            author: charName,
            authorAvatar: getContactAvatar(charName),
            text: comment.trim(),
            timestamp: getRpTimestamp()
        });

        savePosts();
        console.log(`💬 [Instagram] ${charName}의 댓글: ${comment}`);

        // 히든 로그
        addHiddenLog(charName, `[Instagram 댓글] ${charName}가 ${post.author}의 게시물에 댓글을 남겼습니다: "${comment.trim()}"`);
    }

    // ========== 히든 로그 ==========
    function addHiddenLog(sender, content) {
        const ctx = window.SillyTavern?.getContext?.();
        if (!ctx?.chat) return;

        const hiddenMessage = {
            name: sender,
            mes: content,
            is_user: false,
            is_system: false,
            extra: {
                isSmallSys: true,
                force_avatar: false,
                is_phone_log: true,
                type: 'instagram'
            }
        };

        ctx.chat.push(hiddenMessage);

        // 저장
        const parser = ctx.SlashCommandParser || window.SlashCommandParser;
        if (parser?.commands?.['savechat']) {
            parser.commands['savechat'].callback({});
        }
    }

    // ========== 렌더링 함수 ==========
    function open() {
        console.log('📸 [Instagram] open() 호출됨');
        loadPosts();

        const $screen = window.STPhone.UI.getContentElement();
        console.log('📸 [Instagram] $screen:', $screen, 'length:', $screen?.length);
        if (!$screen || !$screen.length) {
            console.error('📸 [Instagram] $screen을 찾을 수 없음!');
            return;
        }
        $screen.empty();

        const html = `
            ${css}
            <div class="st-insta-app">
                <div class="st-insta-header">
                    <div class="st-insta-logo">Instagram</div>
                    <div class="st-insta-header-icons">
                        <i class="fa-regular fa-heart st-insta-header-icon"></i>
                        <i class="fa-regular fa-paper-plane st-insta-header-icon"></i>
                    </div>
                </div>
                <div class="st-insta-feed" id="st-insta-feed">
                    ${renderFeed()}
                </div>
                <div class="st-insta-fab" id="st-insta-fab">
                    <i class="fa-solid fa-plus"></i>
                </div>
            </div>
        `;

        $screen.append(html);
        attachListeners();
    }

    // 스토리 기능 제거됨
    function renderStories() {
        return '';
    }

    function renderFeed() {
        if (posts.length === 0) {
            return `
                <div class="st-insta-empty">
                    <div class="st-insta-empty-icon"><i class="fa-regular fa-image"></i></div>
                    <div class="st-insta-empty-title">게시물이 없습니다</div>
                    <div>+ 버튼을 눌러 첫 게시물을 올려보세요!</div>
                </div>
            `;
        }

        return posts.map(post => renderPost(post)).join('');
    }

    function renderPost(post) {
        const likedClass = post.likedByUser ? 'liked' : '';
        const likeIcon = post.likedByUser ? 'fa-solid fa-heart' : 'fa-regular fa-heart';

        let commentsHtml = '';
        if (post.comments && post.comments.length > 0) {
            if (post.comments.length > 2) {
                commentsHtml = `<div class="st-insta-post-comments" data-post-id="${post.id}">댓글 ${post.comments.length}개 모두 보기</div>`;
            }
            // 최근 2개 댓글만 표시
            const recentComments = post.comments.slice(-2);
            commentsHtml += `<div class="st-insta-comments-list">`;
            recentComments.forEach(c => {
                commentsHtml += `
                    <div class="st-insta-comment-item">
                        <span><strong class="st-insta-comment-author">${escapeHtml(c.author)}</strong>${escapeHtml(c.text)}</span>
                    </div>
                `;
            });
            commentsHtml += '</div>';
        }

        // 이미지가 있을 때만 표시
        const imageHtml = post.imageUrl 
            ? `<img class="st-insta-post-image" src="${post.imageUrl}" alt="" loading="lazy">`
            : '';

        return `
            <div class="st-insta-post" data-post-id="${post.id}">
                <div class="st-insta-post-header">
                    <img class="st-insta-post-avatar" src="${post.authorAvatar || getContactAvatar(post.author)}" alt="">
                    <span class="st-insta-post-author" data-author="${escapeHtml(post.author)}">${escapeHtml(post.author)}</span>
                    <i class="fa-solid fa-ellipsis st-insta-post-more" data-post-id="${post.id}"></i>
                </div>
                ${imageHtml}
                <div class="st-insta-post-actions">
                    <i class="${likeIcon} st-insta-post-action ${likedClass}" data-action="like" data-post-id="${post.id}"></i>
                    <i class="fa-regular fa-comment st-insta-post-action" data-action="comment" data-post-id="${post.id}"></i>
                    <i class="fa-regular fa-paper-plane st-insta-post-action"></i>
                    <i class="fa-regular fa-bookmark st-insta-post-action st-insta-post-bookmark"></i>
                </div>
                <div class="st-insta-post-likes">좋아요 ${post.likes + (post.likedByUser ? 1 : 0)}개</div>
                <div class="st-insta-post-caption">
                    <strong>${escapeHtml(post.author)}</strong>${escapeHtml(post.caption)}
                </div>
                ${commentsHtml}
                <div class="st-insta-post-time">${formatTimeAgo(post.timestamp)}</div>
                <div class="st-insta-comment-input">
                    <input type="text" placeholder="댓글 달기..." data-post-id="${post.id}">
                    <span class="st-insta-comment-btn" data-post-id="${post.id}">게시</span>
                </div>
            </div>
        `;
    }

    function openCreateScreen() {
        const $app = $('.st-insta-app');
        
        const createHtml = `
            <div class="st-insta-create" id="st-insta-create">
                <div class="st-insta-create-header">
                    <span class="st-insta-create-cancel" id="st-insta-create-cancel">✕</span>
                    <span class="st-insta-create-title">새 게시물</span>
                    <span class="st-insta-create-next" id="st-insta-create-share">공유</span>
                </div>
                <div class="st-insta-create-content" style="overflow-y: auto;">
                    <div class="st-insta-create-preview" id="st-insta-create-preview">
                        <i class="fa-regular fa-image"></i>
                        <div style="font-size: 12px; color: var(--pt-sub-text, #8e8e8e); margin-top: 8px;">공유 시 자동 생성됩니다</div>
                    </div>
                    
                    <div style="background: var(--pt-card-bg, #fff); border-radius: 12px; padding: 14px; margin-bottom: 12px;">
                        <div style="font-size: 13px; font-weight: 600; color: var(--pt-sub-text, #8e8e8e); margin-bottom: 8px;">
                            <i class="fa-solid fa-wand-magic-sparkles" style="margin-right: 6px;"></i>이미지 생성 프롬프트
                        </div>
                        <textarea class="st-insta-create-prompt" id="st-insta-create-prompt" 
                                  placeholder="예: 카페에서 커피 마시는 셀카, 창밖 비오는 날씨"
                                  style="min-height: 60px;"></textarea>
                    </div>
                    
                    <div style="background: var(--pt-card-bg, #fff); border-radius: 12px; padding: 14px;">
                        <div style="font-size: 13px; font-weight: 600; color: var(--pt-sub-text, #8e8e8e); margin-bottom: 8px;">
                            <i class="fa-regular fa-pen-to-square" style="margin-right: 6px;"></i>피드 캡션
                        </div>
                        <textarea class="st-insta-create-caption" id="st-insta-create-caption" 
                                  placeholder="예: 오늘의 커피 ☕ #카페스타그램 #일상"
                                  style="min-height: 80px;"></textarea>
                    </div>
                </div>
            </div>
        `;

        $app.append(createHtml);
        attachCreateListeners();
    }

    function attachListeners() {
        // 새 게시물 (FAB 버튼)
        $('#st-insta-fab').off('click').on('click', openCreateScreen);

        // 좋아요
        $('.st-insta-post-action[data-action="like"]').off('click').on('click', function() {
            const postId = parseInt($(this).data('post-id'));
            toggleLike(postId);
        });

        // 댓글 입력
        $('.st-insta-comment-input input').off('input').on('input', function() {
            const val = $(this).val().trim();
            const postId = $(this).data('post-id');
            $(`.st-insta-comment-btn[data-post-id="${postId}"]`).toggleClass('active', val.length > 0);
        });

        // 댓글 게시
        $('.st-insta-comment-btn').off('click').on('click', function() {
            const postId = parseInt($(this).data('post-id'));
            const $input = $(`.st-insta-comment-input input[data-post-id="${postId}"]`);
            const text = $input.val().trim();
            
            if (text) {
                addUserComment(postId, text);
                $input.val('');
                $(this).removeClass('active');
            }
        });

        // 프로필 보기
        $('.st-insta-post-author').off('click').on('click', function() {
            const name = $(this).data('author');
            openProfile(name);
        });

        // 더보기 메뉴
        $('.st-insta-post-more').off('click').on('click', function() {
            const postId = parseInt($(this).data('post-id'));
            showPostMenu(postId);
        });
    }

    function attachCreateListeners() {
        // 취소
        $('#st-insta-create-cancel').off('click').on('click', function() {
            $('#st-insta-create').remove();
        });

        // 엔터키로 공유
        $('#st-insta-create-prompt, #st-insta-create-caption').off('keydown').on('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                $('#st-insta-create-share').click();
            }
        });

        // 공유 (이미지 생성 + 게시 자동)
        $('#st-insta-create-share').off('click').on('click', async function() {
            const prompt = $('#st-insta-create-prompt').val().trim();
            const caption = $('#st-insta-create-caption').val().trim() || '📸';
            const user = getUserInfo();

            if (!prompt && !caption) {
                toastr.warning('프롬프트나 캡션 중 하나는 입력해주세요');
                return;
            }

            const $btn = $(this);
            const $preview = $('#st-insta-create-preview');
            
            let imageUrl = null;

            try {
                // 프롬프트가 있으면 이미지 생성
                if (prompt) {
                    $btn.addClass('disabled').text('생성 중...');
                    $preview.html('<div class="st-insta-spinner"></div><div style="font-size: 12px; color: var(--pt-sub-text, #8e8e8e); margin-top: 8px;">이미지 생성 중...</div>');

                    // AI 프롬프트 상세화 후 이미지 생성 (카메라/메신저와 동일)
                    const detailedPrompt = await generateDetailedPrompt(prompt, user.name);
                    console.log('[Instagram] 상세화된 프롬프트:', detailedPrompt);
                    imageUrl = await generateImage(detailedPrompt);

                    if (!imageUrl) {
                        throw new Error('이미지 생성 실패');
                    }

                    $preview.html(`<img src="${imageUrl}" alt="">`);
                    toastr.success('이미지 생성 완료! 게시 중...');
                } else {
                    // 이미지 없이 텍스트만 게시
                    $btn.addClass('disabled').text('게시 중...');
                }

                // 포스트 추가
                const newPost = {
                    id: Date.now(),
                    author: user.name,
                    authorAvatar: user.avatar,
                    imageUrl: imageUrl || '',
                    caption: caption,
                    timestamp: getRpTimestamp(),
                    likes: 0,
                    likedByUser: false,
                    comments: [],
                    isUser: true
                };

                loadPosts();
                posts.unshift(newPost);
                savePosts();

                // 히든 로그
                addHiddenLog(user.name, `[Instagram 포스팅] ${user.name}가 Instagram에 게시물을 올렸습니다: "${caption}"`);

                toastr.success('게시물이 업로드되었습니다!');
                
                // 화면 새로고침
                $('#st-insta-create').remove();
                open();

                // 캐릭터 댓글 트리거
                setTimeout(() => {
                    const charInfo = getCharacterInfo();
                    checkAndGenerateComment(newPost.id, charInfo.name);
                }, 3000);

            } catch (e) {
                $preview.html('<i class="fa-regular fa-image"></i><div style="font-size: 12px; color: var(--pt-sub-text, #8e8e8e); margin-top: 8px;">공유 시 자동 생성됩니다</div>');
                $btn.removeClass('disabled').text('공유');
                toastr.error('이미지 생성에 실패했습니다');
            }
        });
    }

    function toggleLike(postId) {
        loadPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        post.likedByUser = !post.likedByUser;
        savePosts();

        // UI 업데이트
        const $icon = $(`.st-insta-post-action[data-action="like"][data-post-id="${postId}"]`);
        if (post.likedByUser) {
            $icon.removeClass('fa-regular').addClass('fa-solid liked');
        } else {
            $icon.removeClass('fa-solid liked').addClass('fa-regular');
        }

        const $likes = $icon.closest('.st-insta-post').find('.st-insta-post-likes');
        $likes.text(`좋아요 ${post.likes + (post.likedByUser ? 1 : 0)}개`);
    }

    function addUserComment(postId, text) {
        loadPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const user = getUserInfo();

        post.comments.push({
            id: Date.now(),
            author: user.name,
            authorAvatar: user.avatar,
            text: text,
            timestamp: getRpTimestamp()
        });

        savePosts();

        // 히든 로그
        addHiddenLog(user.name, `[Instagram 댓글] ${user.name}가 ${post.author}의 게시물에 댓글을 남겼습니다: "${text}"`);

        // UI 새로고침
        open();

        // 캐릭터 답댓글
        setTimeout(() => {
            const charInfo = getCharacterInfo();
            if (!post.isUser) {
                // 캐릭터 게시물에 댓글 달면 캐릭터가 답글
                checkCharacterReplyToComment(postId, charInfo.name, user.name, text);
            }
        }, 2000);
    }

    async function checkCharacterReplyToComment(postId, charName, commenterName, commentText) {
        loadPosts();
        const post = posts.find(p => p.id === postId);
        if (!post || post.author.toLowerCase() !== charName.toLowerCase()) return;

        const contact = getContactByName(charName);
        const personality = contact?.personality || getCharacterInfo().personality || '';

        const prompt = `You are ${charName} on Instagram. ${commenterName} commented on your post: "${commentText}"
Your post caption was: "${post.caption}"
Personality: ${personality}

Write a short reply comment (1 sentence). Output ONLY the reply text, no quotes.`;

        const reply = await generateWithAI(prompt, 80);
        if (!reply?.trim()) return;

        post.comments.push({
            id: Date.now(),
            author: charName,
            authorAvatar: getContactAvatar(charName),
            text: reply.trim(),
            timestamp: getRpTimestamp()
        });

        savePosts();
        addHiddenLog(charName, `[Instagram 답글] ${charName}가 ${commenterName}의 댓글에 답글을 남겼습니다: "${reply.trim()}"`);
    }

    function openProfile(name) {
        loadPosts();
        const userPosts = posts.filter(p => p.author.toLowerCase() === name.toLowerCase());
        const avatar = getContactAvatar(name);

        const profileHtml = `
            <div class="st-insta-profile" id="st-insta-profile">
                <div class="st-insta-profile-header">
                    <i class="fa-solid fa-arrow-left st-insta-profile-back"></i>
                    <span class="st-insta-profile-name">${escapeHtml(name)}</span>
                </div>
                <div class="st-insta-profile-content">
                    <div class="st-insta-profile-info">
                        <img class="st-insta-profile-avatar" src="${avatar}" alt="">
                        <div class="st-insta-profile-stats">
                            <div class="st-insta-profile-stat">
                                <div class="st-insta-profile-stat-num">${userPosts.length}</div>
                                <div class="st-insta-profile-stat-label">게시물</div>
                            </div>
                            <div class="st-insta-profile-stat">
                                <div class="st-insta-profile-stat-num">${Math.floor(Math.random() * 500) + 100}</div>
                                <div class="st-insta-profile-stat-label">팔로워</div>
                            </div>
                            <div class="st-insta-profile-stat">
                                <div class="st-insta-profile-stat-num">${Math.floor(Math.random() * 200) + 50}</div>
                                <div class="st-insta-profile-stat-label">팔로잉</div>
                            </div>
                        </div>
                    </div>
                    <div class="st-insta-profile-grid">
                        ${userPosts.map(p => `
                            <div class="st-insta-profile-grid-item" data-post-id="${p.id}">
                                <img src="${p.imageUrl}" alt="">
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        $('.st-insta-app').append(profileHtml);

        $('.st-insta-profile-back').on('click', () => {
            $('#st-insta-profile').remove();
        });
    }

    function showPostMenu(postId) {
        loadPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const isOwn = post.isUser;
        const menuItems = isOwn
            ? ['삭제', '취소']
            : ['신고', '취소'];

        const choice = prompt(`게시물 옵션:\n1. ${menuItems[0]}\n2. ${menuItems[1]}\n\n번호를 입력하세요:`);

        if (choice === '1' && isOwn) {
            posts = posts.filter(p => p.id !== postId);
            savePosts();
            toastr.info('게시물이 삭제되었습니다');
            open();
        }
    }

    // ========== 이벤트 리스너 초기화 ==========
    let listenerRegistered = false;
    
    function initProactivePostListener() {
        if (listenerRegistered) return;
        console.log('📸 [Instagram] initProactivePostListener 시작...');
        
        const check = setInterval(() => {
            const ctx = window.SillyTavern?.getContext?.();
            if (!ctx) {
                console.log('📸 [Instagram] SillyTavern context 대기 중...');
                return;
            }
            clearInterval(check);
            console.log('📸 [Instagram] SillyTavern context 획득!');

            const { eventSource, eventTypes } = ctx;
            console.log('📸 [Instagram] eventSource:', !!eventSource, 'eventTypes.MESSAGE_RECEIVED:', eventTypes?.MESSAGE_RECEIVED);
            
            if (eventSource && eventTypes?.MESSAGE_RECEIVED && !listenerRegistered) {
                listenerRegistered = true;
                eventSource.on(eventTypes.MESSAGE_RECEIVED, (msgId) => {
                    console.log('📸 [Instagram] MESSAGE_RECEIVED 이벤트 수신! msgId:', msgId);
                    setTimeout(() => {
                        const c = window.SillyTavern.getContext();
                        const last = c.chat?.[c.chat.length - 1];
                        console.log('📸 [Instagram] 마지막 메시지:', last?.name, 'is_user:', last?.is_user);
                        if (last && !last.is_user) {
                            checkProactivePost(last.name);
                        }
                    }, 2000);
                });
                console.log('📸 [Instagram] ✅ 프로액티브 포스트 리스너 등록 완료!');
            } else {
                console.warn('📸 [Instagram] ⚠️ 이벤트 리스너 등록 실패 - eventSource:', !!eventSource, 'MESSAGE_RECEIVED:', !!eventTypes?.MESSAGE_RECEIVED);
            }
        }, 500);
    }

    // 초기화
    try {
        initProactivePostListener();
        console.log('📸 [Instagram] 모듈 로딩 완료!');
    } catch (e) {
        console.error('📸 [Instagram] 초기화 오류:', e);
    }

    // 공개 API
    return {
        open,
        generateCharacterPost,
        checkProactivePost,
        loadPosts: () => { loadPosts(); return posts; },
        addComment: addUserComment
    };
})();
