# Spotify Ad Skip ⚡ (Android Standalone)

An autonomous Android mobile service built with **Expo / React Native** and **Native Kotlin Services** that exploits Spotify's playback queue behavior: when an advertisement begins, the app mutes audio, lets Spotify cleanly transition the playback queue, forces Spotify to stop, relaunches it, and resumes your next track—**consuming 0 free skips** and functioning hands-free **even with the screen turned off in your pocket**.

---

## 🎧 How the Loophole Works

```
                                  ┌───────────────────────────────┐
                                  │   Spotify Begins Ad Break     │
                                  └──────────────┬────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                          Spotify Ad Skip Native Pipeline (Kotlin)                           │
│                                                                                             │
│  1. Instant Audio Mute      🔇 Millisecond 0: music stream muted; 0ms ad audio heard.       │
│  2. Muted Settle Delay      ⏳ Wait 2.0s: Spotify commits track completion & advances queue.│
│  3. Screen Wake & Unlock    📱 SpotifyWakeActivity turns display on & bypasses lockscreen   │
│                                via Extend Unlock (Smart Lock).                              │
│  4. Automated Force Stop    🛑 AccessibilityService clicks "Force stop" ➔ "OK" on Spotify.  │
│  5. Cold Relaunch           🚀 Package manager launches Spotify from clean state.           │
│  6. Session Resume          ▶️ MediaController sends PLAY directly to next queued song       │
│                                (0 hourly free skips consumed!).                             │
│  7. Volume Restore          🔊 Audio unmuted to your original listening volume.             │
│  8. Screen Re-Lock          🔒 GLOBAL_ACTION_LOCK_SCREEN puts the display back to sleep.    │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites & Requirements

- **Android Device**: Android 8.0 up to Android 16 (tested on Samsung Galaxy S22+ with One UI / Android 16).
- **Spotify Free Account**: Works on standard Spotify mobile app (`com.spotify.music`).
- **Extend Unlock (Smart Lock)**: Enabled for hands-free, screen-off operation (e.g. connected to your Bluetooth headphones/earbuds or smartwatch).

---

## 📲 How to Install the App

### Option A: Using ADB via USB (Fastest)

If your phone is plugged into your PC with **USB Debugging** enabled:

1. **Build the production Release APK:**
   ```powershell
   cd android
   .\gradlew :app:assembleRelease -x lint -x lintVitalRelease -x lintVitalAnalyzeRelease
   ```
2. **Install directly to your device:**
   ```bash
   adb install -r android/app/build/outputs/apk/release/app-release.apk
   ```
3. **Grant Background Activity Permission:**
   ```bash
   adb shell appops set com.spotifyadskip.app SYSTEM_ALERT_WINDOW allow
   ```
4. **Unplug the USB cable**—the app is 100% independent.

---

### Option B: Standalone APK Install (No PC needed after transfer)

1. Find the compiled APK on your PC at:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```
2. Send/transfer `app-release.apk` to your phone (via Google Drive, USB file transfer, Quick Share, or Discord/Telegram saved messages).
3. On your phone, open your **My Files** or **Downloads** app and tap `app-release.apk`.
4. If prompted, allow "Install unknown apps" for that file manager, and tap **Install**.

---

## ⚙️ Phone System Setup (One-Time Configuration)

For the app to operate completely in the background with the screen turned off, complete these 6 settings on your phone:

### 1. Enable Spotify Device Broadcast Status
* Open **Spotify** ➔ tap your **Profile icon** ➔ **Settings & privacy** (gear icon ⚙️).
* Scroll down to **Device Broadcast Status** (*"Allow other apps on your device to see what you are listening to"*).
* Toggle it **ON**.

### 2. Enable Accessibility Service (Required for Force Stop automation)
* Open phone **Settings** ➔ **Accessibility** ➔ **Installed apps** (or *Downloaded apps*).
* Tap **Spotify Ad Skip Auto-Exit Service**.
* Turn the toggle **ON** and tap **Allow**.

> [!NOTE]
> If Android 13+ greys out the toggle with a *"Restricted setting"* warning:
> Go to phone **Settings ➔ Apps ➔ SpotifyAdSkip ➔ tap the three dots (⋮) in the top-right ➔ Allow restricted settings**. Then re-enable the Accessibility Service.

### 3. Grant Notification Listener Access
* Open phone **Settings** ➔ **Apps** ➔ tap **Special app access** (or tap the 3 dots in the top-right).
* Tap **Notification access** (or *Device & app notifications*).
* Find **Spotify Ad Skip Listener** and toggle it **ON**.

### 4. Enable "Appear on Top" / Display Over Other Apps
* Open phone **Settings** ➔ **Apps** ➔ **Special app access** ➔ **Appear on top** (or *Display over other apps*).
* Find **SpotifyAdSkip** and toggle it **ON**.
*(This allows the app to launch the wake activity when an ad triggers while your screen is off).*

### 5. Disable Battery Optimization (Keep Alive in Background)
* Open phone **Settings** ➔ **Apps** ➔ **SpotifyAdSkip** ➔ **Battery**.
* Select **Unrestricted**.

---

## 🔒 Pocket & Screen-Off Setup (Extend Unlock)

To enable the app to skip ads seamlessly while the phone is locked in your pocket:

### 1. Configure Extend Unlock (Formerly Smart Lock)
* Go to phone **Settings** ➔ **Security and privacy** ➔ **More security settings** ➔ **Extend Unlock** (or **Smart Lock**).
* Enter your PIN.
* Tap **Trusted devices** ➔ **Add trusted device**.
* Select your Bluetooth earbuds, headphones, or smartwatch.
* *Result:* As long as your headphones are connected, your phone stays in an unlocked state, allowing the app to clear the keyguard and execute the force stop without asking for a fingerprint/PIN.

### 2. Samsung Users: Disable Accidental Touch Protection
* Go to phone **Settings** ➔ **Display**.
* Scroll down to **Accidental touch protection** and toggle it **OFF**.
* *Why:* Samsung's proximity sensor blocks all screen wakeups and window interactions if it detects dark fabric inside a pocket. Disabling this allows the background service to complete the skip sequence inside your pocket.

---

## 🧪 Verifying the Setup

1. Open **Spotify Ad Skip** and ensure the status shows **Skipper Active**.
2. Open **Spotify** and start playing any playlist.
3. Switch back to **Spotify Ad Skip**—the app will display your current song title, artist, and album art.
4. **Test the Loophole:**
   - Tap the **Test Loophole** button in the app.
   - Or lock your screen with music playing and send a test ad broadcast via ADB:
     ```bash
     adb shell am broadcast -a com.spotify.music.metadatachanged -p com.spotifyadskip.app --es id spotify:ad:test --es track Advertisement --es artist Spotify --ez playing true
     ```
   - Watch the phone screen wake up, dismiss the swipe lockscreen, trigger Force Stop on Spotify, cold-relaunch Spotify directly to your next track, and re-lock the phone!

---

## ❓ Frequently Asked Questions (FAQ)

#### Does this count against my 6 hourly free skips?
**No.** The app never calls "skip track" (`skipToNext`). Because Spotify discards the ad session upon being force-stopped, Spotify automatically starts on the next song when reopened. The app only dispatches `PLAY`, consuming **0 free skips**.

#### Why is there a 2-second pause before Spotify closes?
The moment an ad is detected, audio is **instantly muted** (you hear 0ms of the ad). The app waits 2.0 seconds in total silence to give Spotify's player engine time to finalize and commit the previous track's completion to its database. Without this brief pause, Spotify would reopen to the previous song.

#### Does my phone need to stay connected to my computer?
**No.** The app is compiled as a standalone production Release APK. Once installed, it runs entirely on-device with zero dependencies on Metro, ADB, or your PC.
