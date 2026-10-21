# Web & Mobile Browser Screen Protection & Anti-Recording Architecture

A dedicated, comprehensive plan focused exclusively on **`ScreenProtectionGuard.tsx`** and video playback containers across desktop browsers (Windows, macOS) and mobile web browsers (iPhone Safari/Chrome, Android). 

> **Important**: The watermark (`DynamicWatermark.tsx`) remains completely untouched as requested.

---

## 1. Core Threat Vectors & Solutions

### A. Windows Snipping Tool (`Win + Shift + S`, `Win + S`) & Snipping Program
- **Mechanism**: The OS steals window focus before taking a snapshot.
- **Solution**: 
  - On the immediate millisecond `window.onblur` or `document.hasFocus() === false` occurs (outside of text fields), execute an instant DOM hardware blackout (`#000000` curtain + blur/brightness zero filter).
  - When the Snipping Tool cursor crosshair freezes the screen, the frozen frame is pitch black.

### B. Exhaustive Key Combinations (Windows & macOS)
- **Windows Capture Combos**:
  - `Win + Shift + S` (Windows Snipping Tool)
  - `Win + S` (Windows Search / Screen Snipping)
  - `Win + Alt + R` (Windows Game Bar Screen Recording)
  - `Win + G` (Windows Game Bar Overlay)
  - `PrintScreen`, `PrtScn`, `Snapshot` (all variations: standalone, `Alt + PrtScn`, `Ctrl + PrtScn`, `Win + PrtScn`)
  - `Ctrl + Shift + S` (Edge / Browser Web Capture)
  - `Alt + A`, `Ctrl + Alt + S` (common third-party screenshot hotkeys: Lightshot, ShareX, Greenshot)
- **macOS Capture Combos**:
  - `Cmd + Shift + 3` (Full screen capture)
  - `Cmd + Shift + 4` (Selected area capture)
  - `Cmd + Shift + 5` (Screen recording / screenshot panel)
  - `Cmd + Shift + 6` (Touch bar screenshot)
  - `Cmd + Shift + S` (Third-party screen capture tools)
  - `Cmd + Option + 5`
- **Actions on Trigger**: Immediate blackout, `e.preventDefault()`, `e.stopPropagation()`, system clipboard wipe (`navigator.clipboard.writeText('')`), and display of the academic security warning.

### C. Screen Recording Defense & Video Playback Shutter
- **Video Playback Shutter**:
  - Whenever the browser window loses focus (`document.hasFocus() === false`), is minimized, or switches tabs (`document.hidden === true`):
    - All `<video>` and `<audio>` elements instantly **pause**.
    - All media is **muted** (`muted = true`, `volume = 0`).
    - The video rendering surface is blanked (`filter: brightness(0)`, `opacity: 0`, `visibility: hidden`).
    - The blackout security curtain covers the video player container.
  - As soon as the user refocuses the window, the display surface is restored and the student can resume playback.
- **Recording API Interception**:
  - Trap `navigator.mediaDevices.getDisplayMedia` to throw `NotAllowedError`.
  - Trap `window.MediaRecorder` to inject empty/stopped streams.
  - Trap `HTMLCanvasElement.prototype.captureStream` and `HTMLMediaElement.prototype.captureStream` so browser recording extensions cannot capture video pixel buffers.
- **Virtual Audio Capture Detection**:
  - Monitor `navigator.mediaDevices.enumerateDevices` to detect virtual audio loopback drivers (e.g., "Stereo Mix", "Virtual Audio Cable", "OBS Virtual Audio", "BlackHole", "VB-Audio").
  - Auto-mute playback if a virtual recording device is actively selected.

### D. Mobile Web Protection (iPhone Safari & Android Chrome)
- **iOS Safari Recording & Capture Detection**:
  - Detect Control Center pull-down: On iOS Safari, pulling down Control Center to start screen recording causes immediate `window.blur` and `visibilitychange` events. The guard instantly pauses the video and turns the player black.
  - Deny AirPlay & wireless screen mirroring: Enforce `disableRemotePlayback = true` and `x-webkit-airplay: deny` on all media elements to block screen broadcasting to Apple TV or Mac recorders.
  - Intercept multi-finger screen capture gestures and iOS screenshot notifications via WebKit hooks.
- **Android Mobile Browser Protection**:
  - Detect app switching, floating screen recorder overlays (e.g., AZ Screen Recorder, XRecorder) via rapid window blur and focus loss events.
  - Auto-blank video playback immediately when an overlay steals focus.

---

## 2. Implementation Steps

1. **Update `src/components/security/ScreenProtectionGuard.tsx`**:
   - Implement zero-latency focus loss blackout (remove `document.hidden` requirement on blur).
   - Expand keydown and keyup capture listeners with all Windows and macOS screenshot/recording shortcuts.
   - Implement global video playback shutter (auto-pause, mute, and blanking on focus loss or backgrounding).
   - Intercept canvas and media `captureStream` APIs.
   - Harden virtual audio loopback detection and iOS Safari Control Center / AirPlay defense.
2. **Lint & Syntax Verification**:
   - Run `lint_applet` to ensure zero compilation or React hook errors.

---

## 3. Verification & Acceptance Criteria

1. **Windows Snipping Tool Test**:
   - Pressing `Win + Shift + S` or `Win + S` immediately turns the screen black before the snipping tool can freeze the frame.
2. **Lecture Video Focus Test**:
   - Clicking outside the browser window while a lecture video is playing immediately mutes, pauses, and blanks the video. Refocusing the window restores the display.
3. **Screen Recording Extension Test**:
   - Extensions attempting `getDisplayMedia` or `MediaRecorder` fail with security errors.
4. **Mobile Web Safari Test**:
   - Pulling down iOS Control Center or switching apps immediately blanks video playback.
