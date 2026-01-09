(function() {
    'use strict';

const EXTENSION_NAME = 'ST Phone System';
    const EXTENSION_FOLDER = 'st-phone-system';
    const BASE_PATH = `/scripts/extensions/third-party/${EXTENSION_FOLDER}`;

    // 타임스탬프 기능용 상태 추적
    let lastMessageWasHiddenLog = false;  // 마지막 메시지가 히든로그였는지
    let needsTimestampOnNextPhoneMsg = false;  // 다음 폰 메시지에 타임스탬프 필요한지

    function loadModule(fileName) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `${BASE_PATH}/${fileName}`;
            script.onload = () => {
                console.log(`[${EXTENSION_NAME}] Loaded: ${fileName}`);
                resolve();
            };
            script.onerror = (e) => reject(e);
            document.head.appendChild(script);
        });
    }

    async function initialize() {
        console.log(`🚀 [${EXTENSION_NAME}] Starting initialization...`);

        try {
            // 1. Core 모듈 로드
            await loadModule('utils.js');

            // 2. Feature 모듈 로드
            await loadModule('ui.js');
            await loadModule('inputs.js');

            // 3. 기본 Apps 모듈 로드 (apps 폴더 내 파일들)
            await loadModule('apps/settings.js');
            await loadModule('apps/camera.js');
            await loadModule('apps/album.js');
            await loadModule('apps/contacts.js');
            await loadModule('apps/messages.js');
            await loadModule('apps/phone.js');

            // 4. 스토어 앱 로드
            await loadModule('apps/store.js');

            // 5. 스토어에서 설치 가능한 앱들 로드
            await loadModule('apps/store-apps/notes.js');
            await loadModule('apps/store-apps/weather.js');
            await loadModule('apps/store-apps/games.js');
            await loadModule('apps/store-apps/calendar.js');
            await loadModule('apps/store-apps/instagram.js');



            // 6. 모듈별 Init 실행
            if (window.STPhone.UI) {
                window.STPhone.UI.init({
                    utils: window.STPhone.Utils
                });
            }

            if (window.STPhone.Inputs) {
                window.STPhone.Inputs.init({
                    utils: window.STPhone.Utils,
                    ui: window.STPhone.UI
                });
            }

            // 7. 실리태번 옵션 메뉴에 폰 토글 버튼 추가
            addPhoneToggleButton();

            console.log(`✅ [${EXTENSION_NAME}] All modules initialized! Press 'X' to toggle phone.`);

        } catch (error) {
            console.error(`❌ [${EXTENSION_NAME}] Initialization failed:`, error);
        }
    }

    // [NEW] 실리태번 옵션 메뉴에 폰 토글 버튼 추가
    function addPhoneToggleButton() {
        // 이미 추가되어 있으면 스킵
        if ($('#option_toggle_phone').length > 0) return;

        // 옵션 메뉴 (#options .options-content)에 폰 버튼 추가
        const $optionsContent = $('#options .options-content');
        if ($optionsContent.length > 0) {
            // Author's Note 항목 뒤에 추가
            const phoneOption = `
                <a id="option_toggle_phone">
                    <i class="fa-lg fa-solid fa-mobile-screen"></i>
                    <span>📱 Phone</span>
                </a>
            `;
            
            // option_toggle_AN 뒤에 삽입
            const $anOption = $('#option_toggle_AN');
            if ($anOption.length > 0) {
                $anOption.after(phoneOption);
            } else {
                // 못 찾으면 그냥 맨 앞에 추가
                $optionsContent.prepend(phoneOption);
            }

            // 클릭 이벤트 연결
            $('#option_toggle_phone').on('click', function() {
                // 옵션 메뉴 닫기
                $('#options').hide();
                
                // 폰 토글
                if (window.STPhone && window.STPhone.UI) {
                    window.STPhone.UI.togglePhone();
                }
            });

            console.log(`📱 [${EXTENSION_NAME}] Phone toggle button added to options menu.`);
        }
    }

    $(document).ready(function() {
        setTimeout(initialize, 500);

        // 메인 채팅 감시자 실행
       // 수정후 코드
        // 메인 채팅 감시자 실행
        setupChatObserver();

        // 캘린더 프롬프트 주입 이벤트 리스너
        setupCalendarPromptInjector();
    });

    // 감시자 함수 정의
/* ==============================================================
   수정후 코드 (index.js 하단부를 이걸로 완전히 교체하세요)
   ============================================================== */

    // [중요] 페이지 로드 시 기존 메시지도 검사하기 위해 Observer 시작 전 스캔 실행
    function applyHideLogicToAll() {
        const messages = document.querySelectorAll('.mes');
        messages.forEach(node => {
            hideSystemLogs(node); // 이미 있는 메시지 숨기기
        });
    }

    // 감시자 함수 정의 (Observer)
    function setupChatObserver() {
        // 채팅창(#chat)이 존재할 때까지 대기
        const target = document.querySelector('#chat');
        if (!target) {
            setTimeout(setupChatObserver, 1000);
            return;
        }

        // 1. [핵심] 챗이 로드되자마자 현재 화면에 있는 로그들을 싹 검사해서 숨김
        applyHideLogicToAll();

        // 2. 새 메시지가 추가되는지 감시
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // 노드가 추가될 때 (새 메시지, 혹은 채팅 로드)
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList.contains('mes')) {
                        // 순서 중요: 먼저 숨길 건지 판단하고 -> 그 다음 폰과 동기화
                        hideSystemLogs(node);
                        processSync(node);
                    }
                });
            });
        });

        observer.observe(target, { childList: true, subtree: true });
        console.log(`[${EXTENSION_NAME}] Chat Observer & Auto-Hider Started.`);
    }

    // [신규 기능] 폰 로그인지 검사하고 숨겨주는 함수
    function hideSystemLogs(node) {
        // 이미 처리된 건 스킵
        if (node.classList.contains('st-phone-hidden-log')) return;

        const textDiv = node.querySelector('.mes_text');
        if (!textDiv) return;

        const text = textDiv.innerText;

/* 수정후 코드 (안전한 버전) */

        // [핵심 설명]
        // ^   : 문장의 시작을 의미
        // \s* : 앞에 띄어쓰기가 몇 칸 있든 상관없이 잡아냄
        // 이렇게 해야 "나는 (SMS) 를 보냈다" 같은 문장은 안 숨겨지고,
        // 진짜 시스템 로그 "(SMS) 안녕" 만 숨겨집니다.

// [수정후 코드 모습] - 이 부분을 복사해서 'hiddenPatterns' 부분을 덮어씌우세요.
        const hiddenPatterns = [
            /^\s*\[📞/i,           // 통화 시작/진행 로그
            /^\s*\[❌/i,           // 통화 종료 로그
            /^\s*\[📩/i,           // 문자 수신 로그 (사진 포함)
            /^\s*\[📵/i,           // [🌟추가됨] 거절/부재중 로그 숨기기
            /^\s*\[⛔/i,           // [🌟추가됨] 차단됨 로그 숨기기
            /^\s*\[🚫/i,           // [NEW] 이거다. "읽씹(IGNORE)" 로그 숨기기 추가됨
            /^\s*\[📲/i,           // 에어드롭 거절 로그 숨기기
            /^\s*\[ts:/i,          // [NEW] 타임스탬프 로그 숨기기
            /^\s*\[⏰/i,           // [NEW] 타임스탬프 로그 숨기기 (Time Skip)
        ];



        // 패턴 중 하나라도 맞으면 CSS 숨김 클래스 부여
        const shouldHide = hiddenPatterns.some(regex => regex.test(text));

        if (shouldHide) {
            node.classList.add('st-phone-hidden-log');
            // 혹시 모르니 style 속성으로도 이중 잠금
            node.style.display = 'none';
        }
    }

// 메시지 분석 및 폰으로 전송 (동기화)
    function processSync(node) {
        if (window.STPhone.Apps.Settings && window.STPhone.Apps.Settings.getSettings) {
            const s = window.STPhone.Apps.Settings.getSettings();
            // chatToSms 값이 존재하고 false라면(꺼져있다면) 중단
            if (s.chatToSms === false) {
                return;
            }
        }
        
        // 히든로그인지 확인
        const isHiddenLog = node.classList.contains('st-phone-hidden-log') || node.style.display === 'none';
        
        // 타임스탬프 로직: 히든로그 -> 일반채팅 -> 히든로그 전환 감지
        if (isHiddenLog) {
            // 히든로그가 온 경우
            if (!lastMessageWasHiddenLog && needsTimestampOnNextPhoneMsg) {
                // 일반채팅 후 첫 히든로그 = 타임스탬프 필요 플래그 유지
            }
            lastMessageWasHiddenLog = true;
            return;  // 히든로그는 동기화 안 함
        } else {
            // 일반 채팅이 온 경우
            if (lastMessageWasHiddenLog) {
                // 히든로그에서 일반채팅으로 바뀜 = 다음 히든로그에 타임스탬프 필요
                needsTimestampOnNextPhoneMsg = true;
            }
            lastMessageWasHiddenLog = false;
        }

        // --- 여기서부터는 기존 로직과 동일 (외부 문자 인식용) ---
        // 예: 유저가 폰 앱을 안 쓰고 채팅창에 직접 "/send (SMS) 안녕" 이라고 쳤을 때를 대비함

        const textDiv = node.querySelector('.mes_text');
        if (!textDiv) return;

        const rawText = textDiv.innerText;

        // (SMS)로 시작하는데 아직 안 숨겨진 게 있다면? -> 유저가 직접 친 것
        // 혹은 다른 확장이 만든 것.
        const smsRegex = /^[\(\[]\s*(?:SMS|Text|MMS|Message|문자)\s*[\)\]][:：]?\s*(.*)/i;
        const match = rawText.match(smsRegex);

        if (match) {
            const cleanText = match[1].trim();
            const isUser = node.getAttribute('is_user') === 'true';

            if (window.STPhone && window.STPhone.Apps && window.STPhone.Apps.Messages) {
                const sender = isUser ? 'me' : 'them';
                // 폰 앱 내부로 전송
                window.STPhone.Apps.Messages.syncExternalMessage(sender, cleanText);
            }
        }
    }
// 수정후 코드
// 타임스탬프 플래그를 외부에서 접근 가능하게 노출
    window.STPhoneTimestamp = {
        needsTimestamp: function() {
            const needs = needsTimestampOnNextPhoneMsg;
            needsTimestampOnNextPhoneMsg = false;  // 사용 후 리셋
            return needs;
        }
    };

    // ========== 캘린더 프롬프트 주입 시스템 ==========
    function setupCalendarPromptInjector() {
        const checkInterval = setInterval(() => {
            const ctx = window.SillyTavern?.getContext?.();
            if (!ctx) return;
            
            clearInterval(checkInterval);
            
            const eventSource = ctx.eventSource;
            const eventTypes = ctx.eventTypes;
            
            if (eventSource && eventTypes) {
                // 프롬프트 생성 전 이벤트에 캘린더 프롬프트 주입
                eventSource.on(eventTypes.CHAT_COMPLETION_PROMPT_READY, (data) => {
                    injectCalendarPrompt(data);
                });
                
                // AI 응답 받은 후 날짜 추출
                eventSource.on(eventTypes.MESSAGE_RECEIVED, (messageId) => {
                    setTimeout(() => processCalendarResponse(), 300);
                });
                
                console.log(`📅 [${EXTENSION_NAME}] Calendar prompt injector initialized`);
            } else {
                console.warn(`📅 [${EXTENSION_NAME}] Event system not available, using fallback`);
                // 폴백: MutationObserver로 응답 감시
                setupCalendarResponseObserver();
            }
        }, 1000);
    }

    function injectCalendarPrompt(data) {
        // [NEW] 폰 앱(문자/전화)에서 AI 생성 중이면 주입 안 함
        // 폰 앱은 자체적으로 getEventsOnlyPrompt()를 사용함
        if (window.STPhone?.isPhoneGenerating) {
            console.log(`📅 [${EXTENSION_NAME}] Calendar prompt skipped (phone app is generating)`);
            return;
        }

        // 캘린더 앱이 설치되어 있는지 확인
        const Store = window.STPhone?.Apps?.Store;
        if (!Store || !Store.isInstalled('calendar')) {
            return;
        }

        const Calendar = window.STPhone?.Apps?.Calendar;
        if (!Calendar || !Calendar.isCalendarEnabled()) {
            return;
        }

        const calendarPrompt = Calendar.getPrompt();
        if (!calendarPrompt) return;

        // data.chat 또는 data.messages에 프롬프트 주입
        if (data && data.chat && Array.isArray(data.chat)) {
            // 시스템 메시지로 주입
            data.chat.push({
                role: 'system',
                content: calendarPrompt
            });
            console.log(`📅 [${EXTENSION_NAME}] Calendar prompt injected`);
        }
    }


    // 수정후 코드
    function processCalendarResponse() {
        try {
            const Store = window.STPhone?.Apps?.Store;
            if (!Store || !Store.isInstalled('calendar')) {
                return;
            }
            
            const Calendar = window.STPhone?.Apps?.Calendar;
            if (!Calendar) return;
            
            const ctx = window.SillyTavern?.getContext?.();
            if (!ctx || !ctx.chat || ctx.chat.length === 0) return;
            
            const lastMsg = ctx.chat[ctx.chat.length - 1];
            if (!lastMsg || lastMsg.is_user) return;
            
            const msgText = lastMsg.mes || '';
            if (!msgText) return;
            
            // 날짜 추출 및 처리
            const processed = Calendar.processAiResponse(msgText);
            
            // 날짜가 추출되었으면 메시지에서 날짜 부분 숨기기
            if (processed !== msgText) {
                // DOM에서 해당 메시지 찾아서 날짜 부분 숨기기
                setTimeout(() => hideCalendarDateInChat(), 100);
            }
        } catch (e) {
            console.error(`[${EXTENSION_NAME}] processCalendarResponse 에러:`, e);
        }
    }

// 수정후 코드
    function hideCalendarDateInChat() {
        try {
            // 마지막 AI 메시지에서 날짜 형식 숨기기
            const messages = document.querySelectorAll('.mes:not([is_user="true"]) .mes_text');
            if (!messages || messages.length === 0) return;
            
            const lastMsgEl = messages[messages.length - 1];
            if (!lastMsgEl) return;
            
            const html = lastMsgEl.innerHTML;
            if (!html) return;
            
            // [2024년 3월 15일 금요일] 형식을 숨김 처리
            const dateRegex = /\[(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(월요일|화요일|수요일|목요일|금요일|토요일|일요일)\]/g;
            
            // 이미 숨김 처리된 경우 스킵
            if (lastMsgEl.querySelector('.st-calendar-date-hidden')) return;
            
            if (dateRegex.test(html)) {
                // 정규식 재설정 (test 후 lastIndex가 변경되므로)
                const replaceRegex = /\[(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(월요일|화요일|수요일|목요일|금요일|토요일|일요일)\]/g;
                lastMsgEl.innerHTML = html.replace(replaceRegex, '<span class="st-calendar-date-hidden" style="display:none;">$&</span>');
            }
        } catch (e) {
            console.error(`[${EXTENSION_NAME}] hideCalendarDateInChat 에러:`, e);
        }
    }

    function setupCalendarResponseObserver() {
        // 폴백용: MutationObserver로 새 메시지 감시
        const checkChat = setInterval(() => {
            const chatEl = document.querySelector('#chat');
            if (!chatEl) return;
            
            clearInterval(checkChat);
            
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.classList.contains('mes')) {
                            // AI 메시지인 경우에만 처리
                            if (node.getAttribute('is_user') !== 'true') {
                                setTimeout(() => processCalendarResponse(), 300);
                            }
                        }
                    });
                });
            });
            
            observer.observe(chatEl, { childList: true, subtree: true });
        }, 1000);
    }
})();
