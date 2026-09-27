/* EsprinNemo 官网交互
   仅维护页面自身状态：主题、顶栏与移动端导航、截图预览、版本号。 */

(function () {
    'use strict';

    var THEME_KEY = 'en-site-theme';
    var THEME_ORDER = ['system', 'light', 'dark'];
    var THEME_META = {
        system: { icon: '#i-auto', label: '跟随系统' },
        light: { icon: '#i-sun', label: '浅色' },
        dark: { icon: '#i-moon', label: '深色' }
    };

    var RELEASE_API = 'https://api.github.com/repos/EsprinProject/Nemo/releases/latest';

    var root = document.documentElement;

    /* --------------------------------------------------------------
       主题：浅色 / 深色 / 跟随系统三态循环，与应用内保持一致
       -------------------------------------------------------------- */
    function readTheme() {
        try {
            var stored = localStorage.getItem(THEME_KEY);
            return THEME_ORDER.indexOf(stored) >= 0 ? stored : 'system';
        } catch (e) {
            return 'system';
        }
    }

    function writeTheme(value) {
        try {
            localStorage.setItem(THEME_KEY, value);
        } catch (e) {
            /* 隐私模式下忽略 */
        }
    }

    function systemPrefersLight() {
        return window.matchMedia('(prefers-color-scheme: light)').matches;
    }

    var theme = readTheme();

    function renderTheme() {
        var isLight = theme === 'light' || (theme === 'system' && systemPrefersLight());
        root.classList.toggle('light', isLight);

        var meta = THEME_META[theme];
        var use = document.getElementById('theme-icon-use');
        if (use) {
            use.setAttribute('href', meta.icon);
            use.setAttribute('xlink:href', meta.icon);
        }
        var button = document.getElementById('btn-theme');
        if (button) {
            button.title = '主题：' + meta.label + '（点击切换）';
            button.setAttribute('aria-label', button.title);
        }
        syncThemeColorMeta();
    }

    function syncThemeColorMeta() {
        var metaColor = document.querySelector('meta[name="theme-color"]');
        if (!metaColor) return;
        var bg = getComputedStyle(root).getPropertyValue('--bg-body').trim();
        if (bg) metaColor.setAttribute('content', bg);
    }

    function setupTheme() {
        var button = document.getElementById('btn-theme');
        if (button) {
            button.addEventListener('click', function () {
                theme = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
                writeTheme(theme);
                renderTheme();
            });
        }

        // 跟随系统时，系统主题变化要即时生效
        var media = window.matchMedia('(prefers-color-scheme: light)');
        var onMediaChange = function () {
            if (theme === 'system') renderTheme();
        };
        if (media.addEventListener) media.addEventListener('change', onMediaChange);
        else if (media.addListener) media.addListener(onMediaChange);

        renderTheme();
    }

    /* --------------------------------------------------------------
       提示条：与应用内 Toast 同款
       -------------------------------------------------------------- */
    var toastTimer = null;

    function showToast(message) {
        var box = document.getElementById('toast-box');
        if (!box) return;
        box.innerHTML = '';

        var item = document.createElement('div');
        item.className = 'toast-item';
        item.innerHTML = '<svg class="icon xs" aria-hidden="true"><use href="#i-check"/></svg>';
        var text = document.createElement('span');
        text.textContent = message;
        item.appendChild(text);
        box.appendChild(item);

        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () {
            item.style.transition = 'opacity 0.2s, transform 0.2s';
            item.style.opacity = '0';
            item.style.transform = 'translateY(8px)';
            window.setTimeout(function () { item.remove(); }, 220);
        }, 2200);
    }

    /* --------------------------------------------------------------
       顶栏与移动端导航
       -------------------------------------------------------------- */
    function setupHeader() {
        var header = document.querySelector('.site-header');
        if (!header) return;

        var sync = function () {
            header.classList.toggle('is-scrolled', window.scrollY > 8);
        };
        window.addEventListener('scroll', sync, { passive: true });
        sync();
    }

    function setupMobileNav() {
        var toggle = document.getElementById('nav-toggle');
        var sheet = document.getElementById('mobile-nav');
        if (!toggle || !sheet) return;

        var setOpen = function (open) {
            sheet.hidden = !open;
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
        };

        toggle.addEventListener('click', function () {
            setOpen(sheet.hidden);
        });

        sheet.addEventListener('click', function (event) {
            if (event.target.closest('a')) setOpen(false);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Escape' || sheet.hidden) return;
            setOpen(false);
            toggle.focus();
        });

        // 视口放大到顶栏导航可见时收起抽屉，避免两套导航同时出现
        var media = window.matchMedia('(min-width: 941px)');
        var onMediaChange = function () {
            if (media.matches) setOpen(false);
        };
        if (media.addEventListener) media.addEventListener('change', onMediaChange);
        else if (media.addListener) media.addListener(onMediaChange);
    }

    /* --------------------------------------------------------------
       入场动画与锚点高亮
       -------------------------------------------------------------- */
    function setupReveal() {
        var items = document.querySelectorAll('.reveal');
        if (!('IntersectionObserver' in window)) {
            items.forEach(function (item) { item.classList.add('visible'); });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

        items.forEach(function (item, index) {
            item.style.transitionDelay = Math.min(index % 4, 3) * 50 + 'ms';
            observer.observe(item);
        });
    }

    function setupNavHighlight() {
        var links = Array.prototype.slice.call(document.querySelectorAll('#site-nav .nav-link'));
        if (!links.length || !('IntersectionObserver' in window)) return;

        var sections = links
            .map(function (link) { return document.querySelector(link.getAttribute('href')); })
            .filter(Boolean);

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                links.forEach(function (link) {
                    link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
                });
            });
        }, { rootMargin: '-45% 0px -50% 0px' });

        sections.forEach(function (section) { observer.observe(section); });
    }

    /* --------------------------------------------------------------
       复制、截图预览与回到顶部
       -------------------------------------------------------------- */
    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise(function (resolve, reject) {
            var area = document.createElement('textarea');
            area.value = text;
            area.style.position = 'fixed';
            area.style.opacity = '0';
            document.body.appendChild(area);
            area.select();
            try {
                if (document.execCommand('copy')) resolve();
                else reject(new Error('execCommand failed'));
            } catch (e) {
                reject(e);
            } finally {
                area.remove();
            }
        });
    }

    function setupCopy() {
        document.querySelectorAll('[data-copy]').forEach(function (button) {
            button.addEventListener('click', function () {
                copyText(button.dataset.copy.replace(/&#10;/g, '\n')).then(
                    function () { showToast('已复制到剪贴板'); },
                    function () { showToast('复制失败，请手动选择'); }
                );
            });
        });
    }

    function setupLightbox() {
        var box = document.getElementById('lightbox');
        var image = document.getElementById('lightbox-img');
        var caption = document.getElementById('lightbox-caption');
        var closeButton = document.getElementById('lightbox-close');
        if (!box || !image || !caption || !closeButton) return;

        var lastFocus = null;

        var close = function () {
            box.hidden = true;
            image.removeAttribute('src');
            document.body.style.overflow = '';
            if (lastFocus) lastFocus.focus();
        };

        var open = function (trigger) {
            lastFocus = trigger;
            image.setAttribute('src', trigger.dataset.shot);
            image.setAttribute('alt', trigger.dataset.caption || '');
            caption.textContent = trigger.dataset.caption || '';
            box.hidden = false;
            document.body.style.overflow = 'hidden';
            closeButton.focus();
        };

        document.querySelectorAll('.frame-body[data-shot]').forEach(function (trigger) {
            trigger.addEventListener('click', function () { open(trigger); });
        });

        closeButton.addEventListener('click', close);
        box.addEventListener('click', function (event) {
            if (event.target === box) close();
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !box.hidden) close();
        });
    }

    function setupBackTop() {
        var button = document.getElementById('back-top');
        if (!button) return;

        var sync = function () {
            button.hidden = window.scrollY < 640;
        };
        window.addEventListener('scroll', sync, { passive: true });
        sync();

        button.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /* --------------------------------------------------------------
       版本号：读发布页的最新 tag，取不到时保留页面中的静态版本
       -------------------------------------------------------------- */
    function formatDate(value) {
        var date = new Date(value);
        if (isNaN(date.getTime())) return '';
        var pad = function (part) { return (part < 10 ? '0' : '') + part; };
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
    }

    function setupRelease() {
        var tag = document.getElementById('release-tag');
        var note = document.getElementById('release-note');
        if (!tag || !note || !window.fetch) return;

        window.fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } })
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(function (data) {
                if (typeof data.tag_name !== 'string' || !data.tag_name) throw new Error('bad payload');
                tag.textContent = data.tag_name;
                var date = formatDate(data.published_at);
                note.textContent = date ? '发布于 ' + date : '最新发布';
            })
            .catch(function () {
                note.textContent = '版本号以发布页为准';
            });
    }

    function init() {
        setupTheme();
        setupHeader();
        setupMobileNav();
        setupReveal();
        setupNavHighlight();
        setupCopy();
        setupLightbox();
        setupBackTop();
        setupRelease();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
