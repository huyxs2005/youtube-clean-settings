# YouTube Clean Settings

A smaller YouTube settings menu. Keep **Subtitles/CC**, **Playback speed**, and **Quality**, and hide the other rows.

[![Install with Violentmonkey](.github/install.svg)](https://raw.githubusercontent.com/huyxs2005/youtube-clean-settings/main/youtube-clean-settings.user.js)

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/get-it/) if you don't already have it.
2. Click the green **Install with Violentmonkey** button above.
3. Violentmonkey will open an installation screen. Click **Install**, then refresh YouTube.

Already using an older copy? Disable or remove it first. Only one copy of this script should be enabled. If you're testing the full original-settings version, disable that one too.

If the button shows the script as text instead, copy [this direct script link](https://raw.githubusercontent.com/huyxs2005/youtube-clean-settings/main/youtube-clean-settings.user.js) and use Violentmonkey's **Install from URL** option.

## What it changes

- Keeps the three main settings listed above, when the video has them.
- Shrinks the popup to fit the remaining rows, including the inner menu list.
- Leaves the options inside Quality, Playback speed, and Subtitles/CC alone.
- Saves YouTube's DRC (Stable volume) preference as off when the page loads.

The DRC part changes the stored preference. It doesn't keep checking the player or force the switch off during playback. Hiding a setting also doesn't turn it off.

## A couple of things to know

The script matches English setting names, so use YouTube in English. It uses modern CSS, including `:has()`, and needs a browser that supports it. The URL rules include YouTube's desktop, mobile, and youtube-nocookie pages; the menu changes apply where YouTube uses the matching player layout. YouTube Music isn't included.

There are no external libraries, analytics, or network requests in the script. It runs on the YouTube addresses listed in its header and writes the DRC preference to that site's local storage.

To get all the settings back, disable the script in Violentmonkey and refresh YouTube. That restores the menu; it doesn't undo the stored DRC preference. You can change Stable volume yourself afterward.

## If something breaks

YouTube changes its player from time to time. [Open an issue](https://github.com/huyxs2005/youtube-clean-settings/issues) with your browser, Violentmonkey version, and what happened. A screenshot of the settings menu helps.

Current script version: **2.9**.
