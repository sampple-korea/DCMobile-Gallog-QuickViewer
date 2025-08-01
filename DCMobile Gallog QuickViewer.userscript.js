// ==UserScript==
// @name         DCMobile Gallog QuickViewer
// @namespace    https://lvl.kr
// @version      1.1
// @description  갤로그에 직접 들어가지 않고 반/고닉의 정보를 빠르게 확인할수 있습니다.
// @author       삼플
// @match        https://m.dcinside.com/board/*
// @match        https://m.dcinside.com/mini/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @connect      m.dcinside.com
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        cacheExpiry: 3600000,
        forceDarkMode: null,
    };

    const cache = {
        get: (key) => {
            const item = GM_getValue(key, null);
            if (!item || Date.now() > item.expiry) {
                if (item) GM_deleteValue(key);
                return null;
            }
            return item.data;
        },
        set: (key, data) => {
            GM_setValue(key, { data, expiry: Date.now() + CONFIG.cacheExpiry });
        },
    };

    function injectCSS(css) {
        if (document.getElementById('dgp-style-v14')) return;
        const style = document.createElement('style');
        style.id = 'dgp-style-v14';
        style.textContent = css;
        document.head.appendChild(style);
    }

    injectCSS(`
        :root {
            --dgp-bg-color: rgba(255, 255, 255, 0.85); --dgp-text-color: #1a202c; --dgp-border-color: rgba(0, 0, 0, 0.05);
            --dgp-shadow-color-1: rgba(45, 55, 72, 0.15); --dgp-shadow-color-2: rgba(45, 55, 72, 0.1);
            --dgp-highlight-gradient: linear-gradient(60deg, #007BFF, #3b82f6);
            --dgp-muted-color: #718096; --dgp-error-color: #e53e3e;
        }
        body.dgp-dark-mode {
            --dgp-bg-color: rgba(26, 32, 44, 0.88); --dgp-text-color: #edf2f7; --dgp-border-color: rgba(255, 255, 255, 0.1);
            --dgp-shadow-color-1: rgba(0, 0, 0, 0.35); --dgp-shadow-color-2: rgba(0, 0, 0, 0.25);
            --dgp-highlight-gradient: linear-gradient(60deg, #2ecc71, #38b2ac);
            --dgp-muted-color: #a0aec0;
        }
        #dgp-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 99998;
            opacity: 0; visibility: hidden; transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.5s;
        }
        #dgp-overlay.visible { opacity: 1; visibility: visible; }
        #dgp-tooltip {
            position: fixed; z-index: 99999; background: var(--dgp-bg-color); color: var(--dgp-text-color);
            border: 1px solid var(--dgp-border-color); border-radius: 24px; padding: 24px;
            width: 90%; max-width: 320px; box-shadow: 0 10px 20px var(--dgp-shadow-color-2), 0 25px 50px -10px var(--dgp-shadow-color-1);
            font-size: 15px; line-height: 1.7; visibility: hidden; word-break: keep-all;
            backdrop-filter: blur(4px) saturate(180%); -webkit-backdrop-filter: blur(4px) saturate(180%);
            will-change: transform, opacity, clip-path;
        }
        #dgp-tooltip.visible-start { visibility: visible; }
        #dgp-tooltip.visible-end .dgp-item, #dgp-tooltip.visible-end .dgp-userid-wrapper, #dgp-tooltip.visible-end .dgp-footer { opacity: 1; transform: none; }
        #dgp-tooltip.visible-end .dgp-title { clip-path: inset(0 0 0 0); }
        .dgp-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .dgp-title {
            font-size: 21px; font-weight: 800; color: transparent;
            background: var(--dgp-highlight-gradient); -webkit-background-clip: text; background-clip: text;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 15px; letter-spacing: -0.8px;
            clip-path: inset(0 100% 0 0); transition: clip-path 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.15s;
        }
        .dgp-userid-wrapper { display: flex; align-items: center; text-align: right; white-space: nowrap; opacity: 0; transform: translateY(5px); transition: opacity 0.4s ease 0.25s, transform 0.4s ease 0.25s; }
        .dgp-privacy-icon { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-right: 5px; color: var(--dgp-muted-color); }
        .dgp-userid { font-size: 13px; font-weight: 500; color: var(--dgp-muted-color); }
        .dgp-refresh-btn { cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; opacity: 0.6; transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s; margin-left: 4px; }
        .dgp-refresh-btn:hover { opacity: 1; transform: rotate(360deg) scale(1.1); }
        .dgp-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; opacity: 0; transform: translateY(10px); transition: opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1), transform 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
        .dgp-item:nth-of-type(2) { transition-delay: 0.2s; }
        .dgp-item:nth-of-type(3) { transition-delay: 0.25s; }
        .dgp-item:nth-of-type(4) { transition-delay: 0.3s; }
        .dgp-item:nth-of-type(5) { transition-delay: 0.35s; }
        .dgp-label { font-weight: 400; color: var(--dgp-muted-color); }
        .dgp-value { font-weight: 600; }
        .dgp-footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--dgp-border-color); font-size: 13px; color: var(--dgp-muted-color); display: flex; justify-content: space-between; align-items: center; opacity: 0; transition: opacity 0.4s ease 0.4s; }
        .dgp-direct-link { color: var(--dgp-muted-color); text-decoration: none; font-weight: 500; transition: color 0.2s; }
        .dgp-direct-link:hover { color: var(--dgp-highlight-color); }
        .dgp-loading-spinner { border: 2px solid var(--dgp-border-color); border-top-color: var(--dgp-muted-color); border-radius: 50%; width: 15px; height: 15px; animation: dgp-spin 0.8s cubic-bezier(0.5, 0.15, 0.5, 0.85) infinite; display: inline-block; }
        @keyframes dgp-spin { to { transform: rotate(360deg); } }
        .dgp-click-feedback { transform: scale(0.92); opacity: 0.6; transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.1s; }
    `);
    const overlay = document.createElement('div');
    overlay.id = 'dgp-overlay';
    document.body.appendChild(overlay);

    const tooltip = document.createElement('div');
    tooltip.id = 'dgp-tooltip';
    document.body.appendChild(tooltip);

    let currentAnimation = null;
    const onScrollHandler = () => hideTooltip();
    const parseGallogData = (html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const getData = (selector, regex) => doc.querySelector(selector)?.textContent.trim().match(regex)?.[1] || doc.querySelector(selector)?.textContent.trim() || 'N/A';
        
        const privacyEl = doc.querySelector('section.grid:nth-of-type(2) .md-tit .btn-mline');
        let privacy = 'public';
        if (privacyEl) {
            const privacyText = privacyEl.textContent.trim();
            if (privacyText === '비공개') {
                privacy = 'private';
            } else if (privacyText === '일부 공개') {
                privacy = 'partial';
            }
        }
        
        return {
            visitors: getData('.today-visit', /([\d,]+\s*\/\s*[\d,]+)/),
            posts: getData('section.grid:nth-of-type(2) .md-tit a', /\(([\d,]+)\)/),
            comments: getData('section.grid:nth-of-type(3) .md-tit a', /\(([\d,]+)\)/),
            silbe: doc.querySelector('#galler-badge .point-red')?.textContent.trim() || '0회',
            description: doc.querySelector('.gallog-desc')?.textContent.trim() || '',
            privacy: privacy,
        };
    };
    const fetchGallogInfo = (userId, force = false) => new Promise(resolve => {
        const cacheKey = `gallog_quick_${userId}`;
        if (!force) {
            const cached = cache.get(cacheKey);
            if (cached) return resolve({ ...cached, userId });
        }
        GM_xmlhttpRequest({
            method: 'GET', url: `https://m.dcinside.com/gallog/${userId}`,
            onload: response => {
                if (response.status === 200) {
                    const data = parseGallogData(response.responseText);
                    cache.set(cacheKey, data);
                    resolve({ ...data, userId });
                } else { resolve(null); }
            },
            onerror: () => resolve(null),
        });
    });

    const updateTooltipContent = (data, state = 'loading', originalHref = '#') => {
        const title = data?.description || (state === 'success' ? '갤로그 정보' : '정보 조회');
        const footerCloseGuide = `<span>외부 영역 터치 / 스크롤하여 닫기</span>`;
        let content, footerContent;

        let privacyIconHtml = '';
        let privacyTitle = '';
        switch (data?.privacy) {
            case 'public':
                privacyTitle = '갤로그 전체 공개';
                privacyIconHtml = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zM12 17a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg>`;
                break;
            case 'partial':
                privacyTitle = '갤로그 일부 공개';
                privacyIconHtml = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.74C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l2.17 2.17c.56-.23 1.17-.34 1.83-.34zM2.71 3.16a.996.996 0 000 1.41l2.06 2.06C3.21 8.27 1.81 10.08 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l2.06 2.06a.996.996 0 101.41-1.41L4.12 3.16a.996.996 0 00-1.41 0zM12 17a5 5 0 01-5-5c0-.65.13-1.26.36-1.82L15.28 17.1c-.56.23-1.17.36-1.82.36a5.002 5.002 0 01-1.46-.22z"/></svg>`;
                break;
            case 'private':
                privacyTitle = '갤로그 비공개';
                privacyIconHtml = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/></svg>`;
                break;
        }
        const privacyIcon = data?.privacy ? `<span class="dgp-privacy-icon" title="${privacyTitle}">${privacyIconHtml}</span>` : '';


        if (state === 'error') {
            content = `<div class="dgp-header"><div class="dgp-title" style="background:var(--dgp-error-color); clip-path: inset(0 0 0 0);">⚠️ 조회 실패</div></div>
                       <div class="dgp-item" style="opacity:1; transform:none;">네트워크 오류 또는<br>존재하지 않는 사용자입니다.</div>
                       <div class="dgp-footer" style="opacity:1;">${footerCloseGuide}</div>`;
        } else {
            footerContent = `<a href="${originalHref}" target="_blank" class="dgp-direct-link" onclick="event.stopPropagation()">갤로그 바로가기 ↗</a> ${footerCloseGuide}`;
            const [visitors, posts, comments, silbe] = state === 'loading'
                ? Array(4).fill('<span class="dgp-loading-spinner"></span>')
                : [data.visitors, data.posts, data.comments, data.silbe];
            content = `<div class="dgp-header">
                         <div class="dgp-title" title="${title}">${title}</div>
                         <div class="dgp-userid-wrapper">
                           ${privacyIcon}
                           <span class="dgp-userid">${data.userId}</span>
                           <svg class="dgp-refresh-btn" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
                         </div>
                       </div>
                       <div class="dgp-item"><span class="dgp-label">방문자 (오늘/전체)</span><span class="dgp-value">${visitors}</span></div>
                       <div class="dgp-item"><span class="dgp-label">게시물</span><span class="dgp-value">${posts}</span></div>
                       <div class="dgp-item"><span class="dgp-label">댓글</span><span class="dgp-value">${comments}</span></div>
                       <div class="dgp-item"><span class="dgp-label" style="font-weight: 700; color: var(--dgp-highlight-gradient); background: var(--dgp-highlight-gradient); -webkit-background-clip: text; color: transparent;">실베 선정</span><span class="dgp-value">${silbe}</span></div>
                       <div class="dgp-footer">${footerContent}</div>`;
        }
        tooltip.innerHTML = content;
        tooltip.querySelector('.dgp-refresh-btn')?.addEventListener('click', async e => {
            e.stopPropagation();
            tooltip.classList.remove('visible-end');
            updateTooltipContent({ userId: data.userId }, 'loading', originalHref);
            const newData = await fetchGallogInfo(data.userId, true);
            if (tooltip.classList.contains('visible-start')) {
                updateTooltipContent(newData, newData ? 'success' : 'error', originalHref);
                setTimeout(() => tooltip.classList.add('visible-end'), 10);
            }
        });
    };

    const showTooltip = async (clickedElement, userId, originalHref) => {
        if (tooltip.classList.contains('visible-start')) return;
        if (currentAnimation) currentAnimation.cancel();

        updateTooltipContent({ userId }, 'loading', originalHref);
        tooltip.classList.add('visible-start');
        overlay.classList.add('visible');

        const rect = clickedElement.getBoundingClientRect();
        const { innerWidth: vw, innerHeight: vh } = window;
        const { offsetWidth: ttWidth, offsetHeight: ttHeight } = tooltip;
        const margin = 15;
        let top = (rect.bottom + ttHeight + margin < vh) ? rect.bottom + margin : rect.top - ttHeight - margin;
        let left = Math.max(margin, Math.min(rect.left + rect.width / 2 - ttWidth / 2, vw - ttWidth - margin));
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        const originX = rect.left - left + rect.width / 2;
        const originY = rect.top - top + rect.height / 2;

        currentAnimation = tooltip.animate([
            { transform: 'scale(0.5)', clipPath: `circle(0% at ${originX}px ${originY}px)`, opacity: 0.5 },
            { transform: 'scale(1)', clipPath: `circle(150% at ${originX}px ${originY}px)`, opacity: 1 }
        ], {
            duration: 600,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            fill: 'forwards'
        });

        setTimeout(() => {
            if (tooltip.classList.contains('visible-start')) {
                 tooltip.classList.add('visible-end');
            }
        }, 10);

        window.addEventListener('scroll', onScrollHandler, { passive: true });

        const data = await fetchGallogInfo(userId, false);
        if (overlay.classList.contains('visible')) {
            updateTooltipContent(data || { userId }, data ? 'success' : 'error', originalHref);
        }
    };

    const hideTooltip = () => {
        if (!tooltip.classList.contains('visible-start')) return;

        window.removeEventListener('scroll', onScrollHandler);
        tooltip.classList.remove('visible-end');
        overlay.classList.remove('visible');

        if (currentAnimation) {
            currentAnimation.reverse();
            currentAnimation.onfinish = () => {
                tooltip.classList.remove('visible-start');
                currentAnimation = null;
            };
        } else {
             tooltip.classList.remove('visible-start');
        }
    };

    overlay.addEventListener('click', hideTooltip);
    tooltip.addEventListener('click', e => {
        if (!e.target.closest('a')) hideTooltip();
    });

    const init = () => {
        const darkModeMatcher = window.matchMedia('(prefers-color-scheme: dark)');
        const applyDarkMode = () => document.body.classList.toggle('dgp-dark-mode', CONFIG.forceDarkMode ?? darkModeMatcher.matches);
        darkModeMatcher.addEventListener('change', applyDarkMode);
        applyDarkMode();

        document.body.addEventListener('click', e => {
            const link = e.target.closest('a[href*="/gallog/"]');
            if (!link || tooltip.contains(link)) return;

            e.preventDefault();
            e.stopPropagation();

            link.classList.add('dgp-click-feedback');
            setTimeout(() => link.classList.remove('dgp-click-feedback'), 150);

            const userIdMatch = link.href.match(/\/gallog\/([^\/?&]+)/);
            if (userIdMatch) {
                setTimeout(() => showTooltip(link, userIdMatch[1], link.href), 50);
            }
        }, true);
    };

    init();
})();
