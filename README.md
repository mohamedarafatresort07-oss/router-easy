# 🔴 Stealth Call Recorder

A covert call recording application for Android with floating bubble interface.

> ⚠️ **Legal Notice**: This app records calls with one-party consent. Only use in jurisdictions where this is legal (e.g., Canada). It's your responsibility to comply with local laws.

## Features

- 🔴 **Floating Bubble** - Draggable bubble appears during calls
- ⏺️ **Tap to Record** - Press bubble to start/stop recording  
- 🤫 **Covert Operation** - No audible announcement to the other party
- 📁 **Auto-Save** - Recordings saved to `StealthRecordings` folder
- 🔄 **Auto-Start** - Works automatically when stealth mode is enabled

## Permissions Required

| Permission | Purpose |
|------------|---------|
| `RECORD_AUDIO` | Record phone call audio |
| `READ_PHONE_STATE` | Detect call state changes |
| `SYSTEM_ALERT_WINDOW` | Show floating bubble overlay |
| `FOREGROUND_SERVICE` | Keep recording active in background |
| `POST_NOTIFICATIONS` | Show recording status (Android 13+) |

## Installation

### Option 1: Build with Android Studio

1. Open project in Android Studio
2. Sync Gradle
3. Build APK: `Build > Build Bundle(s) / APK(s) > Build APK(s)`

### Option 2: Build with GitHub Actions

1. Push to GitHub
2. Workflow runs automatically
3. Download APK from Actions tab

## Recording Quality

| Method | Quality | Notes |
|--------|---------|-------|
| `VOICE_CALL` | Best | Records both parties (device dependent) |
| `MIC` | Good | Fallback, may pick up speaker audio |

## File Location

Recordings saved to:
```
/Android/data/com.stealthrecorder.app/files/StealthRecordings/
```

Filename format: `IN_1234567890_20240115_143022.mp4`

## Compatibility

Best results on:
- Samsung Galaxy series
- Xiaomi / Redmi
- OnePlus
- Vivo

## ⚠️ Important Notes

1. **One-party consent only** - You must be a participant in the call
2. **Device restrictions** - Some devices block call recording at system level
3. **Android 9+** - May require additional settings on some devices
4. **Keep phone unlocked** - Some devices stop background services when locked

## License

MIT License - Use responsibly and legally.
