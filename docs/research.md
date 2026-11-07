# Research notes for v3.0

Checked on November 7, 2026. This implementation was written for this script; the links below document the controls and the limitations that informed it.

## Audio controls

The [YouTube player bundle inspected during development](https://www.youtube.com/s/player/a5c2aafe/player_ias.vflset/vi_VN/base.js) exposes `getVoiceBoostUserPreference`, `setVoiceBoostUserPreference`, `getDrcUserPreference`, and `setDrcUserPreference`.

- Voice boost's toggle maps OFF to **1** and ON to **2**. Its storage key is `yt-player-voice-boost`. Using zero as a generic OFF value would be incorrect.
- Stable volume's toggle maps OFF to **0** and ON to **1**. Its storage key is `yt-player-drc-pref`.
- Both setters update their corresponding player environment values and can request a playback refresh. They are internal methods, not a stable public API.

The [Disable DRC Audio on YouTube source](https://greasyfork.org/en/scripts/518745-disable-drc-audio-on-youtube-spa-fix/code) demonstrates checking `aria-checked` before clicking and notes the Voice boost/Stable volume interaction. v3.0 applies Voice boost first, finds rows by their own labels rather than sibling position, and avoids clicking stale audio switches after applying their player methods.

## Ambient mode

[YouTube Help](https://support.google.com/youtube/answer/12827017?co=GENIE.Platform%3DDesktop&hl=en) describes disabling Ambient mode through the player settings switch. The inspected player bundle's Ambient mode handler saves the preference and emits its actual settings-change event; merely hiding the glow or changing an ARIA attribute does not reproduce that operation.

The [Disable Ambient Mode extension source](https://github.com/44yu5h/Youtube-Disable-Ambient-Ext/blob/master/content.js) independently demonstrates that the traditional settings menu can require an initial open/close before its switches exist in the DOM. v3.0 uses bounded initialization and clicks a checked Ambient mode row through YouTube's own handler. It does not claim that hiding a canvas disables its processing.

## Enforcement and limits

The script checks at startup, on YouTube navigation/player and media events, on relevant ARIA changes, and at one-second intervals in visible tabs. Stored records are repaired only when necessary. Unchecked, disabled, and unknown switches are not blindly toggled. Missing menus get at most three initialization attempts for a player/video key. An open user menu is not automatically closed.

The compact menu and its `.ytp-panel-menu` height/max-height fix remain from v2.9. Menu matching requires English and the traditional `.ytp-settings-menu` layout. Alternative mobile and Shorts menus are outside that routine. Audio methods may still work wherever YouTube exposes them. An absent setting is not evidence that its underlying feature is off.

Validation used simulated DOM/player fixtures, including changed preferences, missing controls, throwing APIs, delayed menu creation, storage failure, and navigation. This does not substitute for live playback testing on every YouTube rollout.
