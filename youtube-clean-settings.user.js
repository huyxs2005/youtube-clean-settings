// ==UserScript==
// @name         YouTube - Clean Settings + Disable DRC
// @namespace    youtube-clean-settings
// @version      2.9
// @description  Keep only 3 settings, compact menu, disable stored DRC
// @match        https://www.youtube.com/*
// @match        https://youtube.com/*
// @match        https://m.youtube.com/*
// @match        https://www.youtube-nocookie.com/*
// @match        https://youtube-nocookie.com/*
// @run-at       document-idle
// @grant        none

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
   const COMPACT = 'vm-compact-settings';
   const STYLE_ID = 'vm-settings-style-29';

   function normalize(text) {
     return (text || '')
       .trim()
       .toLowerCase()
       .replace(/\s+/g, ' ');
   }

   // Remove legacy modifications left by older versions
   document.querySelectorAll(
     '#vm-clean-settings-style'
   ).forEach(el => el.remove());

   // Styling
   function installCSS() {
     if (document.getElementById(STYLE_ID)) return;

     const style = document.createElement('style');
     style.id = STYLE_ID;

     style.textContent = `
       .ytp-settings-menu .${HIDDEN} {
         display: none !important;
       }

       .ytp-settings-menu.${COMPACT} {
         height: var(--vm-compact-height) !important;
       }

       .ytp-settings-menu.${COMPACT}
       .ytp-panel:has(> .ytp-panel-menu > .${HIDDEN}) {
         height: var(--vm-compact-height) !important;
       }

       /* Normal row sizing in the main menu only */
       .ytp-settings-menu
       .ytp-panel-menu:has(> .${HIDDEN})
       > .ytp-menuitem:not(.${HIDDEN}) {
         height: 40px !important;
         min-height: 40px !important;
         box-sizing: border-box !important;
       }

       /* Resize the internal menu list too */
      .ytp-settings-menu.${COMPACT}
      .ytp-panel-menu:has(> .${HIDDEN}) {
       height: var(--vm-compact-height) !important;
      max-height: var(--vm-compact-height) !important;
        }
     `;

     document.documentElement.appendChild(style);
   }

   // Hide every unwanted main-menu setting
   function hideSettings(menu) {
     const lists = menu.querySelectorAll(
       '.ytp-panel-menu'
     );

     for (const list of lists) {
       const items = Array.from(list.children)
         .filter(el =>
           el.classList.contains('ytp-menuitem')
         );

       const labels = items.map(item =>
         normalize(
           item.querySelector(
             '.ytp-menuitem-label'
           )?.textContent
         )
       );

       // A main menu contains our known settings.
       // Submenus should be left unchanged.
       const isMain =
         labels.includes('quality') &&
         labels.includes('playback speed');

       if (!isMain) continue;

       for (let i = 0; i < items.length; i++) {
         items[i].classList.toggle(
           HIDDEN,
           !KEEP.has(labels[i])
         );
       }
     }
   }

   // Resize popup when its main menu is shown
   function resizeMenu(menu) {
     const lists = Array.from(
       menu.querySelectorAll('.ytp-panel-menu')
     );

     const mainList = lists.find(list =>
       Array.from(list.children).some(el =>
         el.classList.contains(HIDDEN)
       )
     );

     if (!mainList) {
       menu.classList.remove(COMPACT);
       return;
     }

     const panel = mainList.closest('.ytp-panel');

     // Don't compact when inside a submenu.
     const header = panel?.querySelector(
       '.ytp-panel-header'
     );

     const submenuOpen = header &&
       getComputedStyle(header).display !== 'none' &&
       getComputedStyle(header).visibility !== 'hidden' &&
       header.getBoundingClientRect().height > 0;

     if (submenuOpen) {
       menu.classList.remove(COMPACT);
       return;
     }

     const visibleRows = Array.from(
       mainList.children
     ).filter(el =>
       el.classList.contains('ytp-menuitem') &&
       !el.classList.contains(HIDDEN)
     );

     if (!visibleRows.length) {
       menu.classList.remove(COMPACT);
       return;
     }

     const listStyle = getComputedStyle(mainList);

     const padding =
       (parseFloat(listStyle.paddingTop) || 0) +
       (parseFloat(listStyle.paddingBottom) || 0);

     // Three rows at 40px + original menu padding
     const height = Math.ceil(
       visibleRows.length * 40 + padding
     );

     menu.style.setProperty(
       '--vm-compact-height',
       `${height}px`
     );

     menu.classList.add(COMPACT);
   }

   function update() {
     for (const menu of document.querySelectorAll(
       '.ytp-settings-menu'
     )) {
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

   // Disable stored DRC preference
   function disableDRC() {
     try {
       const now = Date.now();

       localStorage.setItem(
         'yt-player-drc-pref',
         JSON.stringify({
           data: '0',
           creation: now,
           expiration: now + 31536000000
         })
       );
     } catch {}
   }

   function initialize() {
     installCSS();
     disableDRC();
     scheduleUpdate();

     const observer = new MutationObserver(
       scheduleUpdate
     );

     observer.observe(document.documentElement, {
       childList: true,
       subtree: true,
       characterData: true
     });

     document.addEventListener(
       'click',
       e => {
         if (!(e.target instanceof Element)) return;

         if (e.target.closest(
           '.ytp-settings-menu, .ytp-settings-button'
         )) {
           scheduleUpdate();
           setTimeout(scheduleUpdate, 100);
         }
       },
       true
     );

     document.addEventListener(
       'yt-navigate-finish',
       scheduleUpdate
     );

     document.addEventListener(
       'yt-player-updated',
       scheduleUpdate
     );
   }

   if (document.documentElement) {
     initialize();
   } else {
     document.addEventListener(
       'DOMContentLoaded',
       initialize,
       { once: true }
     );
   }
 })();
