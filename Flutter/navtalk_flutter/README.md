# NavTalk Flutter Sample

A Flutter implementation of the NavTalk real-time virtual human demo. This sample mirrors the feature set of the native iOS demo:

- Live WebRTC video rendering
- Real-time speech capture and streaming through the NavTalk Realtime WebSocket API
- Incremental transcript rendering for both the user and the assistant
- Function call support with REST callbacks
- Persistent chat history and configurable license key storage

## Prerequisites

- Flutter 3.3 or newer (with Dart SDK >= 3.3)
- Xcode 15+ for iOS builds / Android Studio (or Android SDK 33+) for Android builds
- A valid NavTalk license key and character assignment

The project was added without running `flutter create` in this repository. After cloning, run the following once to generate the platform folders:

```bash
cd Flutter/navtalk_flutter
flutter create .
```

This keeps `android/`, `ios/`, and other platform directories in sync with the Flutter version installed on your machine. The command will not overwrite the Dart sources that were added.

## Configuration

Open `lib/src/navtalk_controller.dart` and update the following fields if necessary:

- `baseUrl` – defaults to `transfer.navtalk.ai`
- `license` – can also be set directly in the UI (persisted locally)
- `characterName` – defaults to `navtalk.Leo`
- `voiceType` – defaults to `verse`

Alternatively, enter your license key inside the app before starting the call. The key is stored securely using `shared_preferences`.

## Running the Demo

```bash
# Install dependencies
flutter pub get

# Run on a connected device or simulator
flutter run
```

Before tapping **Call**, ensure microphone permissions are granted. The client will:

1. Open the NavTalk realtime WebSocket (`/api/realtime-api`)
2. Negotiate a WebRTC session for the remote avatar stream
3. Capture microphone audio (PCM16 @ 24 kHz) and send incremental chunks
4. Render incremental transcripts and persist the dialog history locally
5. Handle NavTalk function call responses via REST callback (`/api/realtime_function_call`)

## Project Structure

```
lib/
├── main.dart                 # Flutter UI & state wiring
└── src/
    ├── models/chat_message.dart
    ├── navtalk_controller.dart
    └── widgets/chat_bubble.dart
```

## Notes

- The sample uses the `sound_stream` package for PCM microphone capture and `flutter_webrtc` for remote video rendering.
- Chat history is cached locally and replayed to NavTalk when a new session starts.
- Update the dependency versions in `pubspec.yaml` to match your Flutter SDK if required.

For more information about the NavTalk APIs, refer to the [official documentation](https://www.navtalk.ai/docs).
