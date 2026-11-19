// ==UserScript==
// @name         YouTube - Clean Settings + Disable DRC
// @namespace    youtube-clean-settings
// @version      3.3
// @description  Compact settings menu; keep Stable volume, Voice boost, and Ambient mode off
// @match        https://www.youtube.com/*
// @match        https://youtube.com/*
// @match        https://m.youtube.com/*
// @match        https://www.youtube-nocookie.com/*
// @match        https://youtube-nocookie.com/*
// @run-at       document-idle
// @grant        none
// @inject-into  page
// @homepageURL  https://github.com/huyxs2005/youtube-clean-settings
// @supportURL   https://github.com/huyxs2005/youtube-clean-settings/issues
// @downloadURL  https://raw.githubusercontent.com/huyxs2005/youtube-clean-settings/main/youtube-clean-settings.user.js
// ==/UserScript==

(() => {
  'use strict';

  const KEEP = new Set([
    'subtitles/cc',
    'playback speed',
    'quality'
  ]);

  const HIDDEN = 'vm-hide-yt-setting';
  const SILENT = 'vm-silent-settings-init';
  const STYLE_ID = 'vm-settings-style-33';

  function normalize(text) {
    return (text || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  // Remove legacy modifications left by older versions
  document.querySelectorAll(
    '#vm-clean-settings-style, #vm-settings-style-29, #vm-settings-style-30, ' +
    '#vm-settings-style-31, #vm-settings-style-32'
  ).forEach(el => el.remove());

  // Styling
  function installCSS() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;

    const onlyPanel = '.ytp-panel:nth-child(1 of .ytp-panel):nth-last-child(1 of .ytp-panel)' +
      ':not(.ytp-panel-animate-back, .ytp-panel-animate-forward)';
    const mainList = '.ytp-panel-menu:has(> .${HIDDEN})';
    // YouTube attaches both panels during navigation, including keyboard navigation.
    // Leave popup sizing to YouTube while both panels are attached.
    const compactPopup = `.ytp-settings-menu:has(` +
      `> .ytp-popup-content > ${onlyPanel} > .ytp-panel-menu > .${HIDDEN}, ` +
      `> ${onlyPanel} > .ytp-panel-menu > .${HIDDEN})`;
    const submenu = `${onlyPanel}:has(> .ytp-panel-header)`;
    const openSubmenu = `.ytp-settings-menu:has(> .ytp-popup-content > ${submenu}, > ${submenu})`;

    style.textContent = `
      .ytp-settings-menu .${HIDDEN} {
        display: none !important;
      }

      ${compactPopup},
      ${compactPopup} .ytp-panel:has(> ${mainList}) {
        height: var(--vm-compact-height) !important;
      }

      /* An absolutely positioned submenu contributes no height to the popup. */
      ${openSubmenu} {
        height: auto !important;
        max-height: calc(100% - 72px);
        overflow-y: auto;
      }

      ${openSubmenu} > .ytp-popup-content > ${submenu},
      ${openSubmenu} > ${submenu} {
        position: relative !important;
        inset: auto !important;
        height: auto !important;
      }

      /* Let YouTube measure the filtered list, including when animating Back. */
      .ytp-settings-menu ${mainList} {
        height: auto !important;
      }

      .ytp-settings-menu ${mainList} > .ytp-menuitem:not(.${HIDDEN}) {
        height: 40px !important;
        min-height: 40px !important;
        box-sizing: border-box !important;
      }

      /* Menu opened by the script itself: keep it invisible */
      .html5-video-player.${SILENT} .ytp-settings-menu {
        opacity: 0 !important;
        pointer-events: none !important;
        transition: none !important;
      }
    `;

    document.documentElement.appendChild(style);
  }

  // Hide every unwanted main-menu setting
  function hideSettings(menu) {
    const lists = menu.querySelectorAll('.ytp-panel-menu');

    for (const list of lists) {
      const items = Array.from(list.children)
        .filter(el => el.classList.contains('ytp-menuitem'));

      const labels = items.map(item =>
        normalize(item.querySelector('.ytp-menuitem-label')?.textContent)
      );

      // A main menu contains our known settings.
      // Submenus should be left unchanged.
      const isMain =
        labels.includes('quality') &&
        labels.includes('playback speed');

      if (!isMain) continue;

      for (let i = 0; i < items.length; i++) {
        items[i].classList.toggle(HIDDEN, !KEEP.has(labels[i]));
      }
    }
  }

  // Update the main menu's CSS size without touching YouTube's inline height.
  function resizeMenu(menu) {
    const mainList = menu.querySelector(`.ytp-panel-menu:has(> .${HIDDEN})`);
    if (!mainList) return;

    const visibleRows = mainList.querySelectorAll(
      `:scope > .ytp-menuitem:not(.${HIDDEN})`
    );

    const listStyle = getComputedStyle(mainList);
    const padding =
      (parseFloat(listStyle.paddingTop) || 0) +
      (parseFloat(listStyle.paddingBottom) || 0);

    const height = `${Math.ceil(visibleRows.length * 40 + padding)}px`;
    if (menu.style.getPropertyValue('--vm-compact-height') !== height) {
      menu.style.setProperty('--vm-compact-height', height);
    }
  }

  function update() {
    enforceDisabledSettings();
    for (const menu of document.querySelectorAll('.ytp-settings-menu')) {
      hideSettings(menu);
      resizeMenu(menu);
    }
  }

  // Debounce DOM updates
  let scheduled = false;

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  }

  // YouTube's current player uses different OFF values for these preferences.
  const PREFERENCES = [
    { key: 'yt-player-voice-boost', label: 'voice boost', off: 1,
      get: 'getVoiceBoostUserPreference', set: 'setVoiceBoostUserPreference' },
    { key: 'yt-player-drc-pref', label: 'stable volume', off: 0,
      get: 'getDrcUserPreference', set: 'setDrcUserPreference' }
  ];
  const FORCE_OFF_LABELS = [
    'voice boost', 'stable volume', 'ambient mode', 'cinematic lighting'
  ];
  const lastToggle = new WeakMap();
  const lastAPICall = new WeakMap();
  const menuInitialization = new WeakMap();
  let lastInteraction = 0;
  let navigating = false;
  let enforcing = false;
  let cancelSilentInit = null;
  let enforcementTimer;

  // Keep the original wrapped storage format. Avoid rewriting healthy records.
  function storeOffPreferences() {
    for (const name of ['localStorage', 'sessionStorage']) {
      try {
        const storage = window[name];
        for (const preference of PREFERENCES) {
          let record;
          try { record = JSON.parse(storage.getItem(preference.key)); } catch {}
          const now = Date.now();
          if (record && String(record.data) === String(preference.off) &&
              Number(record.expiration) > now && Number(record.creation) <= now) {
            continue;
          }
          storage.setItem(preference.key, JSON.stringify({
            data: String(preference.off),
            creation: now,
            expiration: now + 31536000000
          }));
        }
      } catch {
        // Storage can be unavailable in private windows or embedded players.
      }
    }
  }

  function forcePlayerPreferences(player) {
    const managed = new Set();
    let calls = lastAPICall.get(player);
    if (!calls) lastAPICall.set(player, calls = new Map());
    // Voice boost first: it can otherwise prevent Stable volume from changing.
    for (const preference of PREFERENCES) {
      try {
        if (typeof player[preference.set] !== 'function') continue;
        if (typeof player[preference.get] === 'function' &&
            Number(player[preference.get]()) === preference.off) {
          managed.add(preference.label);
          continue;
        }
        const now = Date.now();
        if (now - (calls.get(preference.key) ?? -Infinity) < 1000) {
          managed.add(preference.label);
          continue;
        }
        calls.set(preference.key, now);
        player[preference.set](preference.off);
        managed.add(preference.label);
      } catch {
        // The methods may exist before their backing player modules are ready.
      }
    }
    return managed;
  }

  function findSettingRows(player) {
    return Array.from(player.querySelectorAll('.ytp-settings-menu .ytp-menuitem'));
  }

  function settingLabel(row) {
    if (row.classList.contains('ytp-drc-menu-item')) return 'stable volume';
    return normalize(row.querySelector('.ytp-menuitem-label')?.textContent);
  }

  function forceSettingSwitches(player, managed = new Set()) {
    // Find by label, not by sibling position: YouTube can reorder the rows.
    for (const label of FORCE_OFF_LABELS) {
      // A just-updated API can leave a stale checked row briefly. Do not toggle it on.
      if (managed.has(label)) continue;
      const row = findSettingRows(player).find(item => settingLabel(item) === label);
      if (!row) continue;
      const toggle = row.hasAttribute('aria-checked') ? row :
        row.querySelector('[role="switch"][aria-checked], ' +
                          '[role="menuitemcheckbox"][aria-checked]');
      if (!toggle || toggle.getAttribute('aria-checked') !== 'true') continue;
      if (row.getAttribute('aria-disabled') === 'true' ||
          toggle.getAttribute('aria-disabled') === 'true' || toggle.disabled) continue;
      const now = Date.now();
      if (now - (lastToggle.get(toggle) ?? -Infinity) < 1000) continue;
      lastToggle.set(toggle, now);
      toggle.click();
      // Let YouTube update the remaining switches before inspecting them again.
      setTimeout(scheduleUpdate, 100);
      return;
    }
  }

  function settingsMenuOpen(player, button) {
    if (button?.getAttribute('aria-expanded') === 'true') return true;
    const menu = player.querySelector('.ytp-settings-menu');
    return !!menu && getComputedStyle(menu).display !== 'none';
  }

  // The settings rows only exist after the menu has been opened once.
  // Open it invisibly, switch Ambient mode off, then close it again.
  function initializeSettingsMenu(player) {
    if (cancelSilentInit) return;
    // This is the traditional desktop player. Do not click unrelated mobile menus.
    const button = player.querySelector('.ytp-settings-button');
    const video = player.querySelector('video');
    if (!button || button.disabled || !video || video.readyState === 0) return;
    if (settingsMenuOpen(player, button)) return;
    if (document.hidden || navigating || Date.now() - lastInteraction < 2000) return;
    if (player.classList.contains('ad-showing')) return;

    let videoId = '';
    try { videoId = player.getVideoData?.()?.video_id || ''; } catch {}
    const key = location.pathname + location.search + '|' + videoId;
    let state = menuInitialization.get(player);
    if (!state || state.key !== key) {
      state = { key, attempts: 0, nextAttempt: 0, ready: false };
      menuInitialization.set(player, state);
    }
    if (state.ready || state.attempts >= 3 || Date.now() < state.nextAttempt) return;
    // Rows already built (they stay in the DOM after closing): nothing to open.
    if (findSettingRows(player).some(row => settingLabel(row) === 'quality')) {
      state.ready = true;
      return;
    }

    state.attempts++;
    state.nextAttempt = Date.now() + 2000;
    const focus = document.activeElement;
    const startedAt = Date.now();
    let finished = false;

    const reveal = () => {
      player.classList.remove(SILENT);
      cancelSilentInit = null;
      scheduleUpdate();
    };

    const cancel = () => {
      finished = true;
      reveal();
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      if (button.isConnected && settingsMenuOpen(player, button)) button.click();
      // Reveal only after YouTube has had a frame to hide the menu.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (cancelSilentInit !== cancel) return;
        reveal();
        if (focus?.isConnected && document.activeElement === button && focus !== button) {
          focus.focus({ preventScroll: true });
        }
      }));
    };

    cancelSilentInit = cancel;

    player.classList.add(SILENT);
    button.click();

    const step = () => {
      if (finished) return;
      if (!button.isConnected) { finish(); return; }
      if (findSettingRows(player).some(row => settingLabel(row) === 'quality')) {
        state.ready = true;
        forceSettingSwitches(player, forcePlayerPreferences(player));
        setTimeout(finish, 150); // let the Ambient toggle apply before closing
        return;
      }
      // The player never built its settings rows.
      if (Date.now() - startedAt > 1500) {
        finish();
        return;
      }
      setTimeout(step, 50);
    };
    setTimeout(step, 0);
  }

  function enforceDisabledSettings() {
    if (enforcing || navigating) return;
    enforcing = true;
    try {
      storeOffPreferences();
      for (const player of document.querySelectorAll('.html5-video-player')) {
        if (player.classList.contains('ad-showing')) continue;
        const button = player.querySelector('.ytp-settings-button');
        // Switch clicks and preference changes can rebuild the active panel.
        if (settingsMenuOpen(player, button)) continue;
        const managed = forcePlayerPreferences(player);
        forceSettingSwitches(player, managed);
        initializeSettingsMenu(player);
      }
    } finally {
      enforcing = false;
    }
  }

  function installEnforcement() {
    for (const eventName of ['pointerdown', 'keydown', 'click']) {
      document.addEventListener(eventName, event => {
        if (!event.isTrusted) return;
        lastInteraction = Date.now();
        cancelSilentInit?.();
      }, true);
    }
    document.addEventListener('yt-navigate-start', () => {
      navigating = true;
      cancelSilentInit?.();
    });
    document.addEventListener('yt-navigate-finish', () => {
      navigating = false;
      scheduleUpdate();
    });
    for (const eventName of [
      'yt-player-updated', 'yt-page-data-updated', 'loadedmetadata',
      'playing', 'visibilitychange'
    ]) document.addEventListener(eventName, scheduleUpdate, true);
    window.addEventListener('pageshow', scheduleUpdate);
    window.addEventListener('focus', scheduleUpdate);
    // Catch preference changes that do not produce a DOM or navigation event.
    enforcementTimer = setInterval(() => {
      if (!document.hidden) scheduleUpdate();
    }, 1000);
    window.addEventListener('pagehide', event => {
      if (!event.persisted) clearInterval(enforcementTimer);
    });
  }

  function initialize() {
    installCSS();
    storeOffPreferences();
    installEnforcement();
    scheduleUpdate();

    const observer = new MutationObserver(scheduleUpdate);

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-checked', 'aria-disabled', 'aria-expanded']
    });

    document.addEventListener('click', e => {
      if (!(e.target instanceof Element)) return;
      if (e.target.closest('.ytp-settings-menu, .ytp-settings-button')) {
        scheduleUpdate();
        setTimeout(scheduleUpdate, 100);
      }
    }, true);
  }

  if (document.documentElement) {
    initialize();
  } else {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  }
})();
