window.STPhone = window.STPhone || {};

window.STPhone.UI = (function() {
    'use strict';

    let utils;
    let $phoneContainer;

    async function init(dependencies) {
        utils = dependencies.utils;
        if (!utils) return;

        createPhoneElement();
        renderHomeScreen();

        if (window.STPhone.Apps && window.STPhone.Apps.Settings) {
            window.STPhone.Apps.Settings.init();
        }

        // 봇/유저 연락처 자동 동기화
        if (window.STPhone.Apps && window.STPhone.Apps.Contacts) {
            await window.STPhone.Apps.Contacts.syncAutoContacts();
        }

        utils.log('UI Module Initialized.');
    }

    function createPhoneElement() {
        if ($('#st-phone-container').length > 0) return;

        const html = `
            <div id="st-phone-container">
                <div class="st-phone-screen">
                    <div class="st-phone-status-bar">
                        <div class="st-phone-notch"></div>
                    </div>
                    <div id="st-phone-content"></div>
                    <div class="st-phone-home-area" id="st-home-btn" style="position:absolute; bottom:10px; width:100%; height:30px; cursor:pointer; z-index:9999; display:flex; justify-content:center; align-items:center;">
                        <div class="st-phone-home-bar" style="width:130px; height:5px; background:rgba(255,255,255,0.4); border-radius:10px;"></div>
                    </div>
                </div>
            </div>
        `;
        $('body').append(html);
        $phoneContainer = $('#st-phone-container');

        // [수정됨] 스마트 홈 버튼 로직
        $('#st-home-btn').off('click').on('click', function() {
            // 현재 화면에 홈 그리드(앱 아이콘들)가 있는지 확인
            const isHomeScreen = $('#st-phone-content').find('.st-home-grid').length > 0;

            if (isHomeScreen) {
                // 이미 홈 화면이라면 -> 폰 닫기 (Toggle)
                togglePhone();
            } else {
                // 앱 실행 중이라면 -> 홈 화면으로 가기
                renderHomeScreen();
            }
        });

    }

    function renderHomeScreen() {
        const $screen = $('#st-phone-content');
        $screen.empty();

        // 기본 앱 아이콘 정의
        const defaultApps = [
            {
                id: 'phone',
                name: '전화',
                bg: 'linear-gradient(135deg, #4cd964, #34c759)',
                icon: `<svg viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.49-5.15-3.8-6.62-6.65l1.97-1.63c.25-.21.31-.57.25-1.02a11.16 11.16 0 01-.59-3.48c0-.55-.45-1-1-1H4.9c-.55 0-1 .45-1 1C3.9 17.58 13.41 21 16.96 21c.55 0 1-.45 1-1v-3.62c0-.55-.44-1-.95-1z"/></svg>`
            },
            {
                id: 'messages',
                name: '메시지',
                bg: 'linear-gradient(135deg, #4cd964, #34aadc)',
                icon: `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`
            },
            {
                id: 'contacts',
                name: '연락처',
                bg: 'linear-gradient(135deg, #8e8e93, #636366)',
                icon: `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`
            },
            {
                id: 'camera',
                name: '카메라',
                bg: 'linear-gradient(135deg, #555, #1c1c1e)',
                icon: `<svg viewBox="0 0 24 24"><path d="M9.4 5l-1.6 1.8H5c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8.8c0-1.1-.9-2-2-2h-2.8l-1.6-1.8H9.4zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>`
            },
            {
                id: 'album',
                name: '앨범',
                bg: 'linear-gradient(135deg, #ff9500, #ff3b30)',
                icon: `<svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`
            },
            {
                id: 'settings',
                name: '설정',
                bg: 'linear-gradient(135deg, #8e8e93, #5a5a5e)',
                icon: `<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`
            },
            {
                id: 'store',
                name: 'App Store',
                bg: 'linear-gradient(135deg, #007aff, #5ac8fa)',
                icon: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`
            }
        ];

        // 설치된 추가 앱들 가져오기
        let installedApps = [];
        if (window.STPhone.Apps && window.STPhone.Apps.Store) {
            const storeApps = window.STPhone.Apps.Store.getInstalledStoreApps();
            installedApps = storeApps.map(app => ({
                id: app.id,
                icon: app.icon,
                name: app.name,
                bg: app.bg,
                isStoreApp: true
            }));
        }

        // 기본 앱 + 설치된 앱 합치기
        const allApps = [...defaultApps, ...installedApps];

        // 문자 앱 읽지 않은 메시지 수 가져오기
        let unreadCount = 0;
        if (window.STPhone.Apps && window.STPhone.Apps.Messages && window.STPhone.Apps.Messages.getTotalUnread) {
            unreadCount = window.STPhone.Apps.Messages.getTotalUnread();
        }

        let iconsHtml = '';
        allApps.forEach(app => {
            // 문자 앱에 배지 표시
            let badgeHtml = '';
            if (app.id === 'messages' && unreadCount > 0) {
                badgeHtml = `<div class="st-app-badge">${unreadCount > 99 ? '99+' : unreadCount}</div>`;
            }

            iconsHtml += `
                <div class="st-app-icon" data-app="${app.id}" ${app.isStoreApp ? 'data-store-app="true"' : ''} 
                     style="background: ${app.bg}; color: white; padding-bottom: 10px; box-sizing: border-box; position: relative;">
                    ${app.icon}
                    ${badgeHtml}
                </div>
            `;
        });

        const html = `<div class="st-home-grid">${iconsHtml}</div>`;
        $screen.append(html);

        // 이벤트 연결
        $('.st-app-icon').on('click', function() {
            const appId = $(this).data('app');
            const isStoreApp = $(this).data('store-app');
            
            if (isStoreApp) {
                openStoreApp(appId);
            } else {
                openApp(appId);
            }
        });

        // 길게 누르면 삭제 (스토어 앱만)
        let pressTimer;
        $('.st-app-icon[data-store-app="true"]').on('mousedown touchstart', function(e) {
            const $icon = $(this);
            const appId = $icon.data('app');
            
            pressTimer = setTimeout(() => {
                showDeleteConfirm(appId, $icon);
            }, 800);
        }).on('mouseup mouseleave touchend', function() {
            clearTimeout(pressTimer);
        });
    }

    function openApp(appId) {
        const Apps = window.STPhone.Apps;
        if (!Apps) {
            toastr.error('앱을 불러올 수 없습니다.');
            return;
        }

        switch(appId) {
            case 'phone':
                Apps.Phone?.open();
                break;
            case 'messages':
                Apps.Messages?.open();
                break;
            case 'contacts':
                Apps.Contacts?.open();
                break;
            case 'camera':
                Apps.Camera?.open();
                break;
            case 'album':
                Apps.Album?.open();
                break;
            case 'settings':
                Apps.Settings?.open();
                break;
            case 'store':
                Apps.Store?.open();
                break;
            default:
                toastr.warning('앱을 찾을 수 없습니다.');
        }
    }

    // 수정후 코드
    function openStoreApp(appId) {
        const Apps = window.STPhone.Apps;
        if (!Apps) return;

        // 스토어에서 설치한 앱들 실행
        switch(appId) {
            case 'notes':
                Apps.Notes?.open();
                break;
            case 'weather':
                Apps.Weather?.open();
                break;
            case 'music':
                Apps.Music?.open();
                break;
            case 'games':
                Apps.Games?.open();
                break;
            case 'calendar':
                Apps.Calendar?.open();
                break;
            case 'instagram':
                Apps.Instagram?.open();
                break;
            default:
                toastr.warning('앱을 찾을 수 없습니다.');
        }
    }


    function showDeleteConfirm(appId, $icon) {
        const Apps = window.STPhone.Apps;
        const appInfo = Apps.Store?.getStoreAppInfo(appId);
        
        if (!appInfo) return;

        // 삭제 확인 모달 표시
        const confirmHtml = `
            <div id="st-delete-confirm" style="
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 30000;
            ">
                <div style="
                    background: var(--pt-card-bg, #fff);
                    border-radius: 14px;
                    padding: 20px;
                    width: 280px;
                    text-align: center;
                    color: var(--pt-text-color, #000);
                ">
                    <div style="font-size: 36px; margin-bottom: 10px;">${appInfo.icon}</div>
                    <div style="font-size: 17px; font-weight: 600; margin-bottom: 5px;">"${appInfo.name}" 삭제</div>
                    <div style="font-size: 13px; color: var(--pt-sub-text, #86868b); margin-bottom: 20px;">
                        이 앱을 삭제하시겠습니까?
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button id="st-delete-cancel" style="
                            flex: 1;
                            padding: 12px;
                            border: none;
                            border-radius: 10px;
                            background: var(--pt-border, #e5e5e5);
                            color: var(--pt-text-color, #000);
                            font-size: 15px;
                            cursor: pointer;
                        ">취소</button>
                        <button id="st-delete-confirm-btn" style="
                            flex: 1;
                            padding: 12px;
                            border: none;
                            border-radius: 10px;
                            background: #ff3b30;
                            color: white;
                            font-size: 15px;
                            cursor: pointer;
                        ">삭제</button>
                    </div>
                </div>
            </div>
        `;

        $('body').append(confirmHtml);

        $('#st-delete-cancel').on('click', () => {
            $('#st-delete-confirm').remove();
        });

        $('#st-delete-confirm-btn').on('click', () => {
            if (Apps.Store?.uninstallApp(appId)) {
                toastr.info(`🗑️ ${appInfo.name} 삭제됨`);
                $('#st-delete-confirm').remove();
                renderHomeScreen();
            }
        });

        // 배경 클릭시 닫기
        $('#st-delete-confirm').on('click', function(e) {
            if (e.target === this) {
                $(this).remove();
            }
        });
    }

    function togglePhone() {
        if (!$phoneContainer) return;

        // 폰을 화면에 띄우기 직전에 홈 화면(아이콘)을 최신 상태로 새로고침
        // 이렇게 해야 새로고침 직후에도 설치된 앱들이 보입니다.
        if (!$phoneContainer.hasClass('active')) {
            renderHomeScreen();
        }

        $phoneContainer.toggleClass('active');
    }


    function getContentElement() {
        return $('#st-phone-content');
    }

    // 앱 아이콘에 배지 설정
    function setAppBadge(appId, count) {
        const $icon = $(`.st-app-icon[data-app="${appId}"]`);
        $icon.find('.st-app-badge').remove();
        if (count > 0) {
            $icon.append(`<div class="st-app-badge">${count > 99 ? '99+' : count}</div>`);
        }
    }

    // ========== 에어드롭 팝업 UI ==========
    function showAirdropPopup(contact, imageUrl, description) {
        $('#st-airdrop-popup').remove();

        const contactAvatar = contact.avatar || '/img/ai4.png';
        const contactName = contact.name || 'Unknown';

        const popupHtml = `
            <div id="st-airdrop-popup" class="st-airdrop-overlay">
                <div class="st-airdrop-modal">
                    <div class="st-airdrop-header">
                        <div class="st-airdrop-icon">
                            <i class="fa-brands fa-apple"></i>
                        </div>
                        <div class="st-airdrop-title">AirDrop</div>
                        <div class="st-airdrop-subtitle">${contactName} would like to share a photo.</div>
                    </div>
                    <div class="st-airdrop-preview">
                        <img src="${imageUrl}" alt="AirDrop Photo" class="st-airdrop-image">
                    </div>
                    <div class="st-airdrop-actions">
                        <button class="st-airdrop-btn decline" id="st-airdrop-decline">Decline</button>
                        <button class="st-airdrop-btn accept" id="st-airdrop-accept">Accept</button>
                    </div>
                </div>
            </div>
        `;

        const isPhoneActive = $phoneContainer && $phoneContainer.hasClass('active');
        if (isPhoneActive) {
            $phoneContainer.find('.st-phone-screen').append(popupHtml);
        } else {
            $('body').append(popupHtml);
        }

        setTimeout(() => {
            $('#st-airdrop-popup').addClass('active');
        }, 50);

        $('#st-airdrop-decline').on('click', () => {
            closeAirdropPopup();
            toastr.info(`${contactName}의 에어드롭을 거절했습니다.`);
            logAirdropDeclineToContext(contactName, description);
        });

        $('#st-airdrop-accept').on('click', () => {
            closeAirdropPopup();
            
            if (window.STPhone.Apps?.Album) {
                window.STPhone.Apps.Album.addPhoto({
                    url: imageUrl,
                    caption: `${contactName}에게 받은 사진`,
                    date: new Date().toISOString()
                });
                toastr.success(`📸 ${contactName}의 사진이 앨범에 저장되었습니다!`);
            } else {
                toastr.success(`${contactName}의 에어드롭을 수락했습니다.`);
            }
        });

        $('#st-airdrop-popup').on('click', function(e) {
            if (e.target === this) {
                closeAirdropPopup();
            }
        });

        setTimeout(() => {
            if ($('#st-airdrop-popup').length) {
                closeAirdropPopup();
                toastr.info(`${contactName}의 에어드롭이 만료되었습니다.`);
            }
        }, 30000);
    }

    function closeAirdropPopup() {
        const $popup = $('#st-airdrop-popup');
        $popup.removeClass('active');
        setTimeout(() => {
            $popup.remove();
        }, 300);
    }

    function logAirdropDeclineToContext(senderName, photoDescription) {
        try {
            const settings = window.STPhone.Apps?.Settings?.getSettings?.() || {};
            const userName = settings.userName || 'User';
            const logText = `[📲 AirDrop Declined] ${userName} declined ${senderName}'s AirDrop photo request. (Photo: ${photoDescription || 'a photo'})`;

            if (window.STPhone.Apps?.Messages?.addHiddenLog) {
                window.STPhone.Apps.Messages.addHiddenLog('System', logText);
                console.log('📱 [Airdrop] Decline logged via Messages.addHiddenLog');
            } else {
                console.warn('📱 [Airdrop] Messages.addHiddenLog not available, falling back');
                const context = window.SillyTavern?.getContext?.();
                if (context?.chat) {
                    context.chat.push({
                        name: 'System',
                        is_user: false,
                        is_system: false,
                        send_date: Date.now(),
                        mes: logText,
                        extra: { is_phone_log: true, airdrop_declined: true }
                    });
                    if (window.SlashCommandParser?.commands['savechat']) {
                        window.SlashCommandParser.commands['savechat'].callback({});
                    }
                }
            }
        } catch (e) {
            console.error('[Airdrop] Failed to log decline:', e);
        }
    }

    return {
        init,
        togglePhone,
        getContentElement,
        renderHomeScreen,
        openApp,
        openStoreApp,
        setAppBadge,
        showAirdropPopup
    };
})();
