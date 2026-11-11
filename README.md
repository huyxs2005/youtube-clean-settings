# YouTube Clean Settings

A smaller YouTube settings menu that keeps **Stable volume**, **Voice boost**, and **Ambient mode** off. The main menu shows **Subtitles/CC**, **Playback speed**, and **Quality**.

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
- Turns Voice boost off first, then Stable volume, using YouTube's player controls when available.
- Turns Ambient mode off through its actual settings switch. Uses checked switches as a fallback for the audio settings too.
- Rechecks after video changes, when switch states change, and once a second while the tab is visible. If one of the three turns back on, it turns it off again.
- Keeps the stored Voice boost and Stable volume preferences set to off.

Other hidden settings keep their existing values. This version actively enforces OFF for the three settings above; enabling one manually will be undone while the script is running.

## A couple of things to know

Use YouTube in **English** for menu matching. The audio player methods work independently of the labels, but the Ambient mode switch and compact menu use English text. The script uses modern CSS, including `:has()`.

YouTube sometimes creates its switches only after Settings has been opened. If needed, the script opens the traditional settings menu invisibly after playback is ready, waits up to 1.5 seconds for its rows, switches Ambient mode off, and closes it again, with at most three attempts per video. The control bar may still appear briefly. It leaves an already open menu alone and postpones initialization while you're interacting with the page.

This targets the traditional desktop YouTube player, including matching embedded players. The address rules also include mobile YouTube, but its alternative menus, Shorts-specific controls, and YouTube Music aren't supported by the menu routine. Features that YouTube doesn't expose for a video cannot be switched through the menu.

YouTube's player methods are internal and can change. This is ongoing enforcement, not a guarantee that a feature can never run briefly during loading or before its control becomes available. If YouTube removes or renames the controls, the script may need an update.

There are no external libraries, analytics, or direct network requests in the script. It uses YouTube's own player methods and switches, and writes the two audio preferences to that site's local and session storage. YouTube may reload its audio stream when a preference changes.

To stop enforcement and get all the settings back, disable the script in Violentmonkey and refresh YouTube. Existing off preferences remain saved; you can change the switches yourself afterward.

## If something breaks

YouTube changes its player from time to time. [Open an issue](https://github.com/huyxs2005/youtube-clean-settings/issues) with your browser, Violentmonkey version, and what happened. A screenshot of the settings menu helps.

## Version 3.1

Fixes the settings menu popping up (and sometimes staying open) when a video starts. The menu opened by the script is now hidden while it's in use, and closing checks whether the menu is actually shown instead of relying on `aria-expanded`, which YouTube updates after the click. Not yet verified on live YouTube.

## Version 3.0

Adds active OFF enforcement for Stable volume, Voice boost, and Ambient mode, while retaining the v2.9 compact-menu sizing fix. Existing installations keep the same script name and namespace so this installs as an update.

Automated checks cover player-method values and order, switch fallback, navigation, re-enabling, lazy menus, retries, storage failures, and compact/submenu behavior. Live playback across all YouTube layouts has not been verified. See the [research notes](docs/research.md) for sources and compatibility details.
