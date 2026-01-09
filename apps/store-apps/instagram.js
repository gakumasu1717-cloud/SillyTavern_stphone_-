window.STPhone = window.STPhone || {};
window.STPhone.Apps = window.STPhone.Apps || {};

window.STPhone.Apps.Instagram = (function() {
    'use strict';

    // ========== 최적화: 캐시 및 상태 변수 ==========
    let posts = [];
    let currentTab = 'feed';
    let saveTimer = null;
    let cssInjected = false;
    let lastLoadedChatId = null;
    let isGeneratingPost = false;
    let isGeneratingComment = false;
    const DEFAULT_AVATAR = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';

    // ========== 기본 프롬프트 (설정에서 오버라이드 가능) ==========
    const DEFAULT_PROMPTS = {
        // 맥락 판단: 게시물 올려도 되는 상황인가?
        contextCheck: `### Current Story Context
"""
{{context}}
"""

### Question
Based on the story context above, would it be natural for {{char}} to post on Instagram right now?

Consider:
- Is {{char}} physically able to use their phone? (not in conversation, not asleep, not in danger)
- Is there something worth sharing? (a moment, event, feeling)
- Would {{char}} naturally want to share this on social media?

Answer with ONLY "YES" or "NO" (one word only).`,

        // 맥락 판단: 댓글 달아도 될 사이인가?
        commentContextCheck: `### Relationship Context
{{char}} and {{user}} relationship: {{relationship}}

### Post Info
- Posted by: {{postAuthor}}
- Caption: "{{postCaption}}"

### Question
Would it be natural and appropriate for {{char}} to leave a comment on this Instagram post?

Consider:
- Are they close enough to interact on social media?
- Would {{char}} naturally engage with this type of content?
- Is the timing appropriate?

Answer with ONLY "YES" or "NO" (one word only).`,

        // 게시물 캡션 생성
        characterPost: `## Instagram Post Generation
### Core Rules
1. You are {{char}} posting on Instagram.
2. Generate ONLY the caption - no system text, no roleplay actions.
3. Keep it natural and casual (1-3 sentences).
4. Do NOT include hashtags unless absolutely necessary. Keep it simple.

### Character Info
- Name: {{char}}
- Personality: {{personality}}

### Recent Context
{{context}}

### Task
Write an Instagram caption that {{char}} would naturally post.
Output format - ONLY the caption text:`,

        // 댓글 생성
        characterComment: `## Instagram Comment Generation
### Core Rules
1. You are {{char}} commenting on an Instagram post.
2. Generate ONLY the comment - no quotes, no actions.
3. Keep it short and casual (1-2 sentences max).

### Character Info
- Name: {{char}}
- Personality: {{personality}}

### Post Info
- Posted by: {{postAuthor}}
- Caption: "{{postCaption}}"

### Task
Write a natural Instagram comment.
Output format - ONLY the comment text:`,

        // 답글 생성
        characterReply: `## Instagram Reply Generation
### Core Rules
1. You are {{char}} replying to a comment.
2. Generate ONLY the reply - no quotes, no actions.
3. Keep it short (1-2 sentences).

### Your Post Caption
"{{postCaption}}"

### Comment to Reply
{{commenter}} said: "{{comment}}"

### Task
Write a natural reply.
Output format - ONLY the reply text:`
    };

    // ========== CSS (한번만 주입) ==========
    const css = `<style id="st-insta-css">
.st-insta-app{position:absolute;top:0;left:0;width:100%;height:100%;z-index:999;display:flex;flex-direction:column;background:var(--pt-bg-color,#fafafa);color:var(--pt-text-color,#262626);font-family:var(--pt-font,-apple-system,sans-serif)}
.st-insta-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--pt-border,#dbdbdb);background:var(--pt-bg-color,#fff);flex-shrink:0}
.st-insta-logo{font-family:'Billabong',cursive,sans-serif;font-size:24px;font-weight:500;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.st-insta-header-icons{display:flex;gap:16px;font-size:20px}
.st-insta-header-icon{cursor:pointer;color:var(--pt-text-color,#262626)}
.st-insta-tabs{display:flex;border-bottom:1px solid var(--pt-border,#dbdbdb);background:var(--pt-bg-color,#fff);flex-shrink:0}
.st-insta-tab{flex:1;padding:12px;text-align:center;font-size:14px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;color:var(--pt-sub-text,#8e8e8e);transition:all .2s}
.st-insta-tab.active{color:var(--pt-text-color,#262626);border-bottom-color:var(--pt-text-color,#262626)}
#st-insta-content{flex:1;overflow-y:auto;display:flex;flex-direction:column}
.st-insta-feed{flex:1;padding-bottom:80px}
.st-insta-post{background:var(--pt-card-bg,#fff);border-bottom:1px solid var(--pt-border,#dbdbdb);margin-bottom:12px}
.st-insta-post-header{display:flex;align-items:center;padding:12px 14px;gap:10px}
.st-insta-post-avatar{width:32px;height:32px;border-radius:50%;object-fit:cover}
.st-insta-post-user{flex:1}
.st-insta-post-username{font-weight:600;font-size:14px}
.st-insta-post-location{font-size:12px;color:var(--pt-sub-text,#8e8e8e)}
.st-insta-post-more{font-size:16px;cursor:pointer;padding:5px}
.st-insta-post-image{width:100%;aspect-ratio:1;object-fit:cover;background:#f0f0f0}
.st-insta-post-image-placeholder{width:100%;aspect-ratio:1;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-size:48px}
.st-insta-post-actions{display:flex;align-items:center;padding:10px 14px;gap:14px}
.st-insta-action-btn{font-size:22px;cursor:pointer;background:none;border:none;padding:0;color:var(--pt-text-color,#262626);transition:transform .1s}
.st-insta-action-btn:active{transform:scale(.9)}
.st-insta-action-btn.liked{color:#ed4956}
.st-insta-action-spacer{flex:1}
.st-insta-post-likes{padding:0 14px 8px;font-weight:600;font-size:14px}
.st-insta-post-caption{padding:0 14px 8px;font-size:14px;line-height:1.4}
.st-insta-post-caption strong{font-weight:600;margin-right:5px}
.st-insta-view-comments{padding:0 14px 8px;font-size:14px;color:var(--pt-sub-text,#8e8e8e);cursor:pointer}
.st-insta-comments{padding:0 14px 8px}
.st-insta-comment{font-size:14px;margin-bottom:6px;display:flex;align-items:flex-start;gap:8px}
.st-insta-comment-avatar{width:24px;height:24px;border-radius:50%;object-fit:cover;flex-shrink:0}
.st-insta-comment-content{flex:1}
.st-insta-comment strong{font-weight:600;margin-right:5px}
.st-insta-comment-time{font-size:11px;color:var(--pt-sub-text,#8e8e8e);margin-top:2px}
.st-insta-post-time{padding:0 14px 12px;font-size:10px;color:var(--pt-sub-text,#8e8e8e);text-transform:uppercase}
.st-insta-comment-input-wrap{display:flex;align-items:center;padding:10px 14px;border-top:1px solid var(--pt-border,#efefef);gap:10px}
.st-insta-comment-input{flex:1;border:none;background:transparent;font-size:14px;outline:none;color:var(--pt-text-color,#262626)}
.st-insta-comment-input::placeholder{color:var(--pt-sub-text,#8e8e8e)}
.st-insta-comment-post{color:#0095f6;font-weight:600;font-size:14px;cursor:pointer;background:none;border:none}
.st-insta-comment-post:disabled{opacity:.3;cursor:default}
.st-insta-fab{position:absolute;bottom:85px;right:20px;width:56px;height:56px;border-radius:50%;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);color:#fff;border:none;font-size:24px;cursor:pointer;box-shadow:0 4px 15px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;z-index:100}
.st-insta-new-post{position:absolute;top:0;left:0;width:100%;height:100%;background:var(--pt-bg-color,#fff);display:flex;flex-direction:column;z-index:1001}
.st-insta-new-header{display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid var(--pt-border,#dbdbdb)}
.st-insta-new-back{font-size:24px;cursor:pointer;padding:5px;color:var(--pt-text-color,#262626)}
.st-insta-new-title{flex:1;text-align:center;font-weight:600;font-size:16px}
.st-insta-new-share{color:#0095f6;font-weight:600;font-size:14px;cursor:pointer;background:none;border:none}
.st-insta-new-content{flex:1;display:flex;flex-direction:column;padding:16px;gap:16px;overflow-y:auto}
.st-insta-new-image-area{width:100%;aspect-ratio:1;background:var(--pt-card-bg,#f0f0f0);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;border:2px dashed var(--pt-border,#dbdbdb);overflow:hidden}
.st-insta-new-image-area.has-image{border:none}
.st-insta-new-image-area img{width:100%;height:100%;object-fit:cover}
.st-insta-new-image-placeholder{text-align:center;color:var(--pt-sub-text,#8e8e8e)}
.st-insta-new-image-placeholder i{font-size:48px;margin-bottom:10px}
.st-insta-new-caption{width:100%;min-height:80px;border:1px solid var(--pt-border,#dbdbdb);border-radius:12px;padding:12px;font-size:14px;resize:none;outline:none;background:var(--pt-card-bg,#fff);color:var(--pt-text-color,#262626)}
.st-insta-image-url-input{width:100%;padding:12px;border:1px solid var(--pt-border,#dbdbdb);border-radius:8px;font-size:14px;outline:none;background:var(--pt-card-bg,#fff);color:var(--pt-text-color,#262626)}
.st-insta-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--pt-sub-text,#8e8e8e);padding:40px;text-align:center}
.st-insta-empty i{font-size:64px;margin-bottom:16px;opacity:.5}
.st-insta-loading,.st-insta-generating{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 14px;color:var(--pt-sub-text,#8e8e8e);font-size:13px}
.st-insta-spinner{width:24px;height:24px;border:2px solid var(--pt-border,#dbdbdb);border-top-color:#262626;border-radius:50%;animation:insta-spin .8s linear infinite}
@keyframes insta-spin{to{transform:rotate(360deg)}}
.st-insta-post-detail{position:absolute;top:0;left:0;width:100%;height:100%;background:var(--pt-bg-color,#fff);display:flex;flex-direction:column;z-index:1002}
.st-insta-detail-header{display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid var(--pt-border,#dbdbdb)}
.st-insta-detail-back{font-size:24px;cursor:pointer;padding:5px;color:var(--pt-text-color,#262626)}
.st-insta-detail-title{flex:1;text-align:center;font-weight:600;font-size:16px}
.st-insta-detail-content{flex:1;overflow-y:auto}
</style>`;

    // ========== 유틸리티 함수 (캐시 활용) ==========
    const _cache = { userName: null, userAvatar: null, charInfo: null, contacts: null, chatId: null };

    function invalidateCache() { _cache.userName = _cache.userAvatar = _cache.charInfo = _cache.contacts = null; }

    function getStorageKey() {
        const ctx = window.SillyTavern?.getContext?.();
        return ctx?.chatId ? 'st_phone_instagram_' + ctx.chatId : null;
    }

    function loadPosts() {
        const ctx = window.SillyTavern?.getContext?.();
        const currentChatId = ctx?.chatId;
        if (currentChatId && currentChatId === lastLoadedChatId && posts.length > 0) return;
        const key = getStorageKey();
        if (!key) { posts = []; lastLoadedChatId = null; return; }
        try { posts = JSON.parse(localStorage.getItem(key) || '[]'); lastLoadedChatId = currentChatId; }
        catch { posts = []; lastLoadedChatId = null; }
    }

    function savePosts() {
        const key = getStorageKey();
        if (!key) return;
        try { localStorage.setItem(key, JSON.stringify(posts)); } catch (e) { console.error('[Instagram] save fail:', e); }
    }

    function debouncedSavePosts(delay = 300) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(savePosts, delay);
    }

    function getUserName() {
        if (_cache.userName) return _cache.userName;
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        return _cache.userName = settings.userName || window.SillyTavern?.getContext?.()?.name1 || 'User';
    }

    function getUserAvatar() {
        if (_cache.userAvatar) return _cache.userAvatar;
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        return _cache.userAvatar = settings.userAvatar || DEFAULT_AVATAR;
    }

    function getCharacterInfo() {
        if (_cache.charInfo) return _cache.charInfo;
        const ctx = window.SillyTavern?.getContext?.();
        if (!ctx) return { name: 'Character', avatar: DEFAULT_AVATAR, personality: '' };
        const charName = ctx.name2 || 'Character';
        const char = ctx.characters?.[ctx.characterId];
        const charAvatar = char?.avatar ? `/characters/${char.avatar}` : DEFAULT_AVATAR;
        const charPersonality = char?.personality || char?.description || '';
        return _cache.charInfo = { name: charName, avatar: charAvatar, personality: charPersonality };
    }

    function getContacts() {
        if (_cache.contacts) return _cache.contacts;
        return _cache.contacts = window.STPhone.Apps?.Contacts?.getAllContacts?.() || [];
    }

    function getRandomContacts(count, excludeName) {
        const contacts = getContacts().filter(c => c.name !== excludeName && !c.isUser);
        const shuffled = contacts.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    function getContactByName(name) {
        return getContacts().find(c => c.name?.toLowerCase() === name?.toLowerCase());
    }

    function formatTime(ts) {
        const diff = Date.now() - ts;
        const mins = Math.floor(diff / 60000), hrs = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
        if (mins < 1) return '방금 전';
        if (mins < 60) return `${mins}분 전`;
        if (hrs < 24) return `${hrs}시간 전`;
        if (days < 7) return `${days}일 전`;
        const d = new Date(ts);
        return `${d.getMonth() + 1}월 ${d.getDate()}일`;
    }

    function getRecentChatContext(maxLen = 1500) {
        try {
            const ctx = window.SillyTavern?.getContext?.();
            if (!ctx?.chat) return '';
            const msgs = ctx.chat.slice(-15).filter(m => !m.extra?.is_phone_log);
            let result = msgs.map(m => `${m.name}: ${m.mes?.substring(0, 150) || ''}`).join('\n');
            return result.length > maxLen ? result.substring(result.length - maxLen) : result;
        } catch { return ''; }
    }

    // ========== 프롬프트 가져오기 (설정에서 오버라이드 가능) ==========
    function getPrompt(key) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        // settings.js 키 매핑
        const keyMap = {
            contextCheck: 'instaContextPrompt',
            characterPost: 'instaPostPrompt',
            commentContextCheck: 'instaCommentContextPrompt',
            characterComment: 'instaCommentPrompt',
            characterReply: 'instaCommentPrompt'
        };
        const settingsKey = keyMap[key];
        return settings[settingsKey] || DEFAULT_PROMPTS[key] || '';
    }

    function fillPrompt(template, vars) {
        let result = template;
        for (const [k, v] of Object.entries(vars)) {
            result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'gi'), v || '');
        }
        return result;
    }

    // ========== AI 생성 함수 ==========
    function getSlashCommandParser() {
        if (window.SlashCommandParser?.commands) return window.SlashCommandParser;
        const ctx = window.SillyTavern?.getContext?.();
        if (ctx?.SlashCommandParser?.commands) return ctx.SlashCommandParser;
        if (typeof SlashCommandParser !== 'undefined' && SlashCommandParser?.commands) return SlashCommandParser;
        return null;
    }

    async function generateWithAI(prompt, maxTokens = 300) {
        if (window.STPhone.Apps?.Messages?.generateWithProfile) {
            try { return await window.STPhone.Apps.Messages.generateWithProfile(prompt, maxTokens); }
            catch (e) { console.error('[Instagram] generateWithProfile fail:', e); }
        }
        try {
            const parser = getSlashCommandParser();
            const cmd = parser?.commands['genraw'] || parser?.commands['gen'];
            if (!cmd) return null;
            return String(await cmd.callback({ quiet: 'true' }, prompt) || '').trim();
        } catch (e) { console.error('[Instagram] AI gen fail:', e); return null; }
    }

    async function generateImage(prompt) {
        const parser = getSlashCommandParser();
        if (parser?.commands) {
            const sdCmd = parser.commands['sd'] || parser.commands['draw'] || parser.commands['imagine'];
            if (sdCmd?.callback) {
                try {
                    const r = await sdCmd.callback({ quiet: 'true' }, prompt);
                    if (r && typeof r === 'string') return r;
                } catch {}
            }
        }
        try {
            const ctx = window.SillyTavern?.getContext?.();
            const exec = ctx?.executeSlashCommands || ctx?.executeSlashCommand;
            if (exec) {
                const r = await exec(`/sd quiet=true ${prompt}`);
                if (r?.pipe) return r.pipe;
                if (typeof r === 'string') return r;
            }
        } catch {}
        return null;
    }


    // 카메라 앱과 동일한 외형 태그 기반 이미지 프롬프트 생성
    async function generateDetailedPrompt(userInput, characterName) {
        const parser = getSlashCommandParser();
        if (!parser || !parser.commands) return userInput;

        const genCmd = parser.commands['genraw'] || parser.commands['gen'];
        if (!genCmd || typeof genCmd.callback !== 'function') return userInput;

        try {
            const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
            const userName = settings.userName || 'User';
            const userTags = settings.userTags || '';

            const allContacts = window.STPhone.Apps?.Contacts?.getAllContacts?.() || [];
            let visualLibrary = '### Visual Tag Library\n';
            visualLibrary += '1. [' + userName + ' (User)]: ' + userTags + '\n';

            let lineNumber = 2;
            for (const contact of allContacts) {
                if (!contact?.name || !contact?.tags) continue;
                visualLibrary += lineNumber + '. [' + contact.name + ']: ' + contact.tags + '\n';
                lineNumber++;
            }

            const aiInstruction = visualLibrary + '\n### Task\nUser request: "' + userInput + '"\nCharacter: ' + characterName + '\nBased on the Library, create a detailed image prompt using the character tags.\nExample output: <pic prompt="tags, comma, separated">';

            const aiResponse = await genCmd.callback({ quiet: 'true' }, aiInstruction);
            const match = String(aiResponse).match(/<pic[^>]*\sprompt="([^"]*)"[^>]*?>/i);
            if (match && match[1]?.trim()) return match[1];
        } catch (e) { console.warn('[Instagram] detailed prompt fail:', e); }

        return userInput;
    }
    function addHiddenLog(speaker, text) {
        if (window.STPhone.Apps?.Messages?.addHiddenLog) {
            window.STPhone.Apps.Messages.addHiddenLog(speaker, text);
            return;
        }
        const ctx = window.SillyTavern?.getContext?.();
        if (!ctx?.chat) return;
        ctx.chat.push({ name: speaker, is_user: false, is_system: false, send_date: Date.now(), mes: text, extra: { is_phone_log: true, is_instagram: true } });
        window.SlashCommandParser?.commands?.['savechat']?.callback?.({});
    }

    // ========== 맥락 판단 함수 (messages.js 참고) ==========
    async function checkContextForPost(charName) {
        const context = getRecentChatContext();
        const template = getPrompt('contextCheck');
        const prompt = fillPrompt(template, { context, char: charName });
        const result = await generateWithAI(prompt, 50);
        const answer = String(result || '').trim().toUpperCase();
        console.debug(' [Instagram] contextCheck:', { charName, answer });
        return answer.includes('YES');
    }

    async function checkContextForComment(charName, charPersonality, postAuthor, postCaption) {
        const contact = getContactByName(charName);
        const relationship = contact?.relationship || contact?.personality || 'acquaintance';
        const template = getPrompt('commentContextCheck');
        const prompt = fillPrompt(template, {
            char: charName, user: getUserName(), relationship, postAuthor, postCaption: postCaption || '(photo)'
        });
        const result = await generateWithAI(prompt, 50);
        const answer = String(result || '').trim().toUpperCase();
        console.debug(' [Instagram] commentContextCheck:', { charName, answer });
        return answer.includes('YES');
    }

    // ========== 메인 UI ==========
    function open() {
        loadPosts();
        invalidateCache();
        const $screen = window.STPhone.UI.getContentElement();
        if (!$screen?.length) return;
        $screen.empty();

        // CSS 한번만 주입
        if (!cssInjected && !$('#st-insta-css').length) {
            $('head').append(css);
            cssInjected = true;
        }

        $screen.append(`
            <div class="st-insta-app">
                <div class="st-insta-header">
                    <div class="st-insta-logo">Instagram</div>
                    <div class="st-insta-header-icons">
                        <i class="fa-regular fa-heart st-insta-header-icon"></i>
                    </div>
                </div>
                <div class="st-insta-tabs">
                    <div class="st-insta-tab active" data-tab="feed"><i class="fa-solid fa-house"></i> 피드</div>
                </div>
                <div id="st-insta-content"></div>
                <button class="st-insta-fab" id="st-insta-new-btn"><i class="fa-solid fa-plus"></i></button>
            </div>
        `);
        renderTab(currentTab);
        attachListeners();
    }

    function renderTab(tab) {
        currentTab = tab;
        const $content = $('#st-insta-content');
        $content.empty();
        if (tab === 'feed') renderFeed($content);
    }

    function renderFeed($content) {
        if (!posts.length) {
            $content.html(`<div class="st-insta-empty"><i class="fa-regular fa-image"></i><div>아직 게시물이 없어요</div><div style="font-size:13px;margin-top:8px;">+ 버튼을 눌러 첫 게시물을 올려보세요!</div></div>`);
            return;
        }
        const sorted = [...posts].sort((a, b) => b.timestamp - a.timestamp);
        let html = '<div class="st-insta-feed">';
        sorted.forEach(p => { html += renderPostCard(p); });
        html += '</div>';
        $content.html(html);
        attachPostListeners();
    }

    function renderPostCard(post) {
        const isLiked = post.likedByUser || false;
        const likeCount = post.likes || 0;
        const imageHtml = post.imageUrl
            ? `<img src="${post.imageUrl}" class="st-insta-post-image" alt="post">`
            : `<div class="st-insta-post-image-placeholder"><i class="fa-regular fa-image"></i></div>`;

        let commentsPreview = '';
        if (post.comments?.length) {
            const preview = post.comments.slice(0, 2);
            commentsPreview = preview.map(c => `<div class="st-insta-comment"><strong>${c.author}</strong>${c.text}</div>`).join('');
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
                    <button class="st-insta-action-btn" data-action="comment" data-post-id="${post.id}"><i class="fa-regular fa-comment"></i></button>
                    <button class="st-insta-action-btn" data-action="share" data-post-id="${post.id}"><i class="fa-regular fa-paper-plane"></i></button>
                    <div class="st-insta-action-spacer"></div>
                    <button class="st-insta-action-btn" data-action="save" data-post-id="${post.id}"><i class="fa-regular fa-bookmark"></i></button>
                </div>
                <div class="st-insta-post-likes">좋아요 ${likeCount}개</div>
                ${post.caption ? `<div class="st-insta-post-caption"><strong>${post.author}</strong>${post.caption}</div>` : ''}
                <div class="st-insta-comments" data-post-id="${post.id}">${commentsPreview}</div>
                <div class="st-insta-post-time">${formatTime(post.timestamp)}</div>
                <div class="st-insta-comment-input-wrap">
                    <input type="text" class="st-insta-comment-input" placeholder="댓글 달기..." data-post-id="${post.id}">
                    <button class="st-insta-comment-post" data-post-id="${post.id}" disabled>게시</button>
                </div>
            </div>`;
    }

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
        $('[data-action="like"]').off('click').on('click', async function() { await toggleLike($(this).data('post-id')); });
        $('.st-insta-comment-input').off('input').on('input', function() {
            const postId = $(this).data('post-id');
            $(`.st-insta-comment-post[data-post-id="${postId}"]`).prop('disabled', !$(this).val().trim());
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
            const post = posts.find(p => p.id === $(this).data('post-id'));
            if (post?.isUser && confirm('이 게시물을 삭제하시겠습니까?')) deletePost(post.id);
        });
    }

    // ========== 좋아요 / 댓글 기능 ==========
    async function toggleLike(postId) {
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        post.likedByUser = !post.likedByUser;
        post.likes = Math.max(0, (post.likes || 0) + (post.likedByUser ? 1 : -1));
        debouncedSavePosts();
        const $btn = $(`[data-action="like"][data-post-id="${postId}"]`);
        const $likes = $btn.closest('.st-insta-post').find('.st-insta-post-likes');
        if (post.likedByUser) { $btn.addClass('liked').find('i').removeClass('fa-regular').addClass('fa-solid'); }
        else { $btn.removeClass('liked').find('i').removeClass('fa-solid').addClass('fa-regular'); }
        $likes.text(`좋아요 ${post.likes}개`);
        if (post.likedByUser) addHiddenLog(getUserName(), `[ Instagram] ${getUserName()}님이 ${post.author}의 게시물에 좋아요를 눌렀습니다.`);
    }

    async function addComment(postId, text, isUser = false) {
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        if (!post.comments) post.comments = [];
        const userName = getUserName(), userAvatar = getUserAvatar();
        const myComment = { id: Date.now(), author: userName, authorAvatar: userAvatar, text, timestamp: Date.now(), isUser: true };
        post.comments.push(myComment);
        debouncedSavePosts();
        addHiddenLog(userName, `[ Instagram] ${userName}님이 ${post.author}의 게시물에 댓글을 남겼습니다: "${text}"`);
        refreshPostComments(postId);
        if (!post.isUser && isUser) await generateAIReplyToComment(postId, myComment);
    }

    async function generateAIReplyToComment(postId, userComment) {
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const $div = $(`.st-insta-comments[data-post-id="${postId}"]`);
        $div.append(`<div class="st-insta-generating" id="gen-${postId}"><div class="st-insta-spinner"></div><span>${post.author}님이 답글 작성 중...</span></div>`);
        try {
            const template = getPrompt('characterReply');
            const prompt = fillPrompt(template, { char: post.author, postCaption: post.caption || '', commenter: userComment.author, comment: userComment.text });
            const reply = await generateWithAI(prompt, 150);
            $(`#gen-${postId}`).remove();
            if (reply?.trim()) {
                const clean = reply.replace(/^["']|["']$/g, '').trim();
                post.comments.push({ id: Date.now(), author: post.author, authorAvatar: post.authorAvatar, text: clean, timestamp: Date.now(), isUser: false, replyTo: userComment.author });
                debouncedSavePosts();
                addHiddenLog(post.author, `[ Instagram] ${post.author}님이 ${userComment.author}의 댓글에 답글: "${clean}"`);
                refreshPostComments(postId);
            }
        } catch (e) { console.error('[Instagram] reply fail:', e); $(`#gen-${postId}`).remove(); }
    }

    function refreshPostComments(postId) {
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const $div = $(`.st-insta-comments[data-post-id="${postId}"]`);
        let html = '';
        if (post.comments?.length) {
            const preview = post.comments.slice(-3);
            if (post.comments.length > 3) html += `<div class="st-insta-view-comments" data-post-id="${postId}">댓글 ${post.comments.length}개 모두 보기</div>`;
            html += preview.map(c => `<div class="st-insta-comment"><strong>${c.author}</strong>${c.replyTo ? `<span style="color:#8e8e8e">@${c.replyTo}</span> ` : ''}${c.text}</div>`).join('');
        }
        $div.html(html);
        $div.find('.st-insta-view-comments').off('click').on('click', () => openPostDetail(postId));
    }

    // ========== 새 글 작성 ==========
    function openNewPostModal() {
        $('.st-insta-app').append(`
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
        `);
        $('#st-insta-new-close').on('click', () => $('#st-insta-new-modal').remove());
        $('#st-insta-share-btn').on('click', async () => {
            const imagePrompt = $('#st-insta-image-prompt').val().trim();
            const caption = $('#st-insta-caption').val().trim();
            if (!caption && !imagePrompt) { toastr?.warning?.('게시글이나 이미지 프롬프트를 입력해주세요'); return; }
            $('#st-insta-share-btn').prop('disabled', true).text('업로드 중...');
            await createPost('', caption, imagePrompt);
            $('#st-insta-new-modal').remove();
        });
    }

    async function createPost(imageUrl, caption, imagePromptText = '') {
        const userName = getUserName(), userAvatar = getUserAvatar();
        let finalImageUrl = imageUrl;
        if (!finalImageUrl && imagePromptText) {
            try { toastr?.info?.(' 이미지 생성 중...'); finalImageUrl = await generateImage(imagePromptText); }
            catch {}
        }
        const newPost = { id: Date.now(), author: userName, authorAvatar: userAvatar, imageUrl: finalImageUrl || null, caption, timestamp: Date.now(), likes: 0, likedByUser: false, comments: [], isUser: true };
        posts.unshift(newPost);
        debouncedSavePosts();
        addHiddenLog(userName, `[ Instagram] ${userName}님이 새 게시물을 올렸습니다: "${caption || '(사진)'}"`);
        toastr?.success?.('게시물이 공유되었습니다!');
        await generateAIReactions(newPost.id);
        renderTab('feed');
    }

    // ========== AI 반응 생성 (맥락 판단 후 댓글) ==========
    async function generateAIReactions(postId) {
        const post = posts.find(p => p.id === postId);
        if (!post || isGeneratingComment) return;
        isGeneratingComment = true;

        try {
            const charInfo = getCharacterInfo();
            const randomContacts = getRandomContacts(3, charInfo.name);
            const reactors = [{ name: charInfo.name, avatar: charInfo.avatar, personality: charInfo.personality, isMain: true }, ...randomContacts.map(c => ({ name: c.name, avatar: c.avatar || DEFAULT_AVATAR, personality: c.personality || '', isMain: false }))];

            for (const reactor of reactors) {
                // 1단계: 맥락 판단 - 댓글 달아도 될 사이인가?
                const shouldComment = await checkContextForComment(reactor.name, reactor.personality, post.author, post.caption);
                if (!shouldComment) {
                    console.log(` [Instagram] ${reactor.name}: 맥락상 댓글 부적절`);
                    continue;
                }

                // 좋아요 (맥락 OK면 높은 확률)
                if (Math.random() < 0.8) {
                    post.likes = (post.likes || 0) + 1;
                    addHiddenLog(reactor.name, `[ Instagram] ${reactor.name}님이 ${post.author}의 게시물에 좋아요를 눌렀습니다.`);
                }

                // 2단계: 댓글 생성
                try {
                    const template = getPrompt('characterComment');
                    const prompt = fillPrompt(template, { char: reactor.name, personality: reactor.personality, postAuthor: post.author, postCaption: post.caption || '(photo)' });
                    const comment = await generateWithAI(prompt, 150);
                    if (comment?.trim()) {
                        const clean = comment.replace(/^["']|["']$/g, '').trim();
                        post.comments.push({ id: Date.now() + Math.random(), author: reactor.name, authorAvatar: reactor.avatar, text: clean, timestamp: Date.now(), isUser: false });
                        addHiddenLog(reactor.name, `[ Instagram] ${reactor.name}님이 ${post.author}의 게시물에 댓글: "${clean}"`);
                    }
                } catch (e) { console.error(`[Instagram] ${reactor.name} comment fail:`, e); }
            }
            debouncedSavePosts();
        } finally { isGeneratingComment = false; }
    }

    // ========== 캐릭터 게시물 생성 (선제 포스트) ==========
    async function generateCharacterPost(charName) {
        if (isGeneratingPost) { console.log(' [Instagram] 이미 게시물 생성 중'); return; }
        isGeneratingPost = true;
        loadPosts();
        invalidateCache();

        let posterName, posterAvatar, posterPersonality;
        const contact = getContactByName(charName);
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

        const context = getRecentChatContext();
        console.log(` [Instagram] ${posterName}님이 게시물을 올리는 중...`);

        try {
            const template = getPrompt('characterPost');
            const prompt = fillPrompt(template, { char: posterName, personality: posterPersonality, context });
            const caption = await generateWithAI(prompt, 200);
            if (caption?.trim()) {
                const clean = caption.replace(/^["']|["']$/g, '').trim();
                let imageUrl = null;
                try { 
                    const detailedPrompt = await generateDetailedPrompt(`${posterName} selfie or photo, ${clean.substring(0, 100)}`, posterName);
                    imageUrl = await generateImage(detailedPrompt);
                } catch {}

                const newPost = { id: Date.now(), author: posterName, authorAvatar: posterAvatar, imageUrl, caption: clean, timestamp: Date.now(), likes: Math.floor(Math.random() * 50) + 10, likedByUser: false, comments: [], isUser: false };
                posts.unshift(newPost);
                debouncedSavePosts();
                addHiddenLog(posterName, `[ Instagram] ${posterName}님이 새 게시물을 올렸습니다: "${clean}"`);
                toastr?.success?.(` ${posterName}님이 인스타그램에 새 게시물을 올렸습니다!`);
                if ($('.st-insta-app').length) renderTab('feed');
            }
        } catch (e) { console.error('[Instagram] char post fail:', e); }
        finally { isGeneratingPost = false; }
    }

    // ========== 선제 포스트 시스템 (messages.js 참고) ==========
    async function checkProactivePost(charName) {
        const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
        console.debug(' [Instagram Proactive] check', { charName, enabled: settings.instagramPostEnabled !== false, isGeneratingPost });
        
        if (settings.instagramPostEnabled === false) {
            console.debug(' [Instagram Proactive] disabled');
            return;
        }

        if (isGeneratingPost) {
            console.debug(' [Instagram Proactive] already generating');
            return;
        }

        // AI가 맥락 판단 - 지금 인스타그램 포스트를 올릴만한 상황인가?
        // 쿨타임/확률 없이 오직 AI 판단에만 의존 (선톡/선전화 시스템과 동일)
        const contextOK = await checkContextForPost(charName);
        if (!contextOK) {
            console.debug(` [Instagram Proactive] ${charName}: AI 판단 - 포스트 부적절`);
            return;
        }

        console.log(` [Instagram Proactive] ${charName}님이 AI 판단에 따라 인스타그램 포스트 생성!`);
        await generateCharacterPost(charName);
    }

    // ========== 선제 포스트 리스너 초기화 ==========
    function initProactivePostListener() {
        console.log(' [Instagram] initProactivePostListener 시작');
        const check = setInterval(() => {
            const ctx = window.SillyTavern?.getContext?.();
            if (!ctx) return;
            clearInterval(check);

            const { eventSource, eventTypes } = ctx;
            if (eventSource && eventTypes?.MESSAGE_RECEIVED) {
                eventSource.on(eventTypes.MESSAGE_RECEIVED, (msgId) => {
                    setTimeout(() => {
                        const c = window.SillyTavern.getContext();
                        if (!c.chat?.length) return;
                        const userMsgCount = c.chat.reduce((n, m) => n + (m?.is_user ? 1 : 0), 0);
                        if (userMsgCount === 0) return;
                        const last = c.chat[c.chat.length - 1];
                        if (last && !last.is_user) checkProactivePost(last.name);
                    }, 1000);
                });
                console.log(' [Instagram] 이벤트 리스너 등록 완료');
            } else if (eventSource) {
                eventSource.on('message_received', () => {
                    setTimeout(() => {
                        const c = window.SillyTavern.getContext();
                        if (!c.chat?.length) return;
                        const userMsgCount = c.chat.reduce((n, m) => n + (m?.is_user ? 1 : 0), 0);
                        if (userMsgCount === 0) return;
                        const last = c.chat[c.chat.length - 1];
                        if (last && !last.is_user) checkProactivePost(last.name);
                    }, 1000);
                });
                console.log(' [Instagram] 이벤트 리스너 등록 (폴백)');
            }
        }, 1000);
    }

    // 앱이 설치되어 있을 때만 선제 포스트 리스너 초기화
    setTimeout(() => {
        const isInstalled = window.STPhone?.Apps?.Store?.isInstalled?.('instagram');
        if (isInstalled) {
            initProactivePostListener();
        } else {
            console.log(' [Instagram] 앱 미설치 - 선제 포스트 리스너 비활성화');
        }
    }, 3000);

    // ========== 게시물 삭제 / 상세보기 ==========
    function deletePost(postId) {
        const idx = posts.findIndex(p => p.id === postId);
        if (idx === -1) return;
        posts.splice(idx, 1);
        debouncedSavePosts();
        addHiddenLog(getUserName(), `[ Instagram] ${getUserName()}님이 게시물을 삭제했습니다.`);
        toastr?.info?.('게시물이 삭제되었습니다');
        renderTab(currentTab);
    }

    function openPostDetail(postId) {
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        let commentsHtml = post.comments?.length
            ? post.comments.map(c => `<div class="st-insta-comment"><img src="${c.authorAvatar || DEFAULT_AVATAR}" class="st-insta-comment-avatar"><div class="st-insta-comment-content"><div><strong>${c.author}</strong>${c.replyTo ? `<span style="color:#8e8e8e">@${c.replyTo}</span> ` : ''}${c.text}</div><div class="st-insta-comment-time">${formatTime(c.timestamp)}</div></div></div>`).join('')
            : '<div class="st-insta-empty" style="padding:40px;"><div>아직 댓글이 없습니다</div></div>';

        $('.st-insta-app').append(`
            <div class="st-insta-post-detail" id="st-insta-detail">
                <div class="st-insta-detail-header">
                    <div class="st-insta-detail-back" id="st-insta-detail-close"></div>
                    <div class="st-insta-detail-title">댓글</div>
                </div>
                <div class="st-insta-detail-content">
                    <div class="st-insta-post-header"><img src="${post.authorAvatar || DEFAULT_AVATAR}" class="st-insta-post-avatar"><div class="st-insta-post-user"><div class="st-insta-post-username">${post.author}</div></div></div>
                    ${post.caption ? `<div class="st-insta-post-caption" style="padding:12px 14px;border-bottom:1px solid var(--pt-border,#dbdbdb);"><strong>${post.author}</strong>${post.caption}<div class="st-insta-post-time" style="padding:8px 0 0;">${formatTime(post.timestamp)}</div></div>` : ''}
                    <div class="st-insta-comments" style="padding:12px 14px;" data-post-id="${post.id}">${commentsHtml}</div>
                </div>
                <div class="st-insta-comment-input-wrap">
                    <input type="text" class="st-insta-comment-input" placeholder="댓글 달기..." data-post-id="${post.id}" id="st-insta-detail-input">
                    <button class="st-insta-comment-post" data-post-id="${post.id}" id="st-insta-detail-post" disabled>게시</button>
                </div>
            </div>
        `);

        $('#st-insta-detail-close').on('click', () => { $('#st-insta-detail').remove(); renderTab('feed'); });
        $('#st-insta-detail-input').on('input', function() { $('#st-insta-detail-post').prop('disabled', !$(this).val().trim()); });
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
        addHiddenLog,
        DEFAULT_PROMPTS  // 설정 UI에서 기본값 참조용
    };
})();