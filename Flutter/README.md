# NavTalk Flutter Sample

A Flutter sample application for real-time NavTalk digital-human conversations on Android and iOS. The app uses WebSocket for signaling and microphone audio upload, and WebRTC for receiving the digital human's real-time audio and video.

## Features

- Connect to a NavTalk real-time session
- Capture and upload microphone audio
- Receive and play real-time digital-human audio and video through WebRTC
- Capture camera frames
- Handle microphone, camera, and Bluetooth audio permissions on Android and iOS

## Requirements

Before running the project, install the following tools:

- Flutter stable
- Dart SDK `3.12.2` or a compatible version
- Android Studio and the Android SDK for Android development
- Xcode and CocoaPods for iOS development (macOS only)

Verify your development environment:

```bash
flutter doctor
```

Resolve any `flutter doctor` errors related to the platform on which you want to run the app.

## Download the Project

Clone the repository with Git:

```bash
git clone <repository-url>
cd navtalk_flutter_sample
```

Alternatively, download and extract the repository ZIP file, then open a terminal in the extracted project directory.

## Configure NavTalk

Before running the app, configure your NavTalk license and digital-human information in:

```text
lib/models/navatlk_manager.dart
```

Find the following fields in `NavTalkManager`:

```dart
String license = '********';       // Required
String characterName = '********'; // Either characterName or characterId is required
String characterId = '********';   // Either characterName or characterId is required
```

Configuration rules:

1. Replace `license` with a valid NavTalk license.
2. Provide either `characterName` or `characterId`.
3. Set the unused field to an empty string (`''`).
4. Do not provide both values unless necessary. If both are non-empty, this sample prioritizes `characterId`.

Example using `characterId`:

```dart
String license = 'YOUR_NAVTALK_LICENSE';
String characterName = '';
String characterId = 'YOUR_CHARACTER_ID';
```

Example using `characterName`:

```dart
String license = 'YOUR_NAVTALK_LICENSE';
String characterName = 'YOUR_CHARACTER_NAME';
String characterId = '';
```

> Never commit a real license to a public repository. For production applications, obtain temporary credentials from a secure backend instead of storing a long-lived license in client source code.

## Install Flutter Dependencies

Run the following command from the project root:

```bash
flutter pub get
```

Do not copy or commit generated directories such as `.dart_tool`, `build`, or `ios/Pods`. They are recreated when dependencies are installed or the app is built.

## Run on Android

1. Start an Android emulator, or connect an Android device with Developer Options and USB debugging enabled.
2. Check that Flutter can detect the device:

```bash
flutter devices
```

3. Run the app from the project root:

```bash
flutter run
```

If multiple devices are connected, specify one explicitly:

```bash
flutter run -d <device-id>
```

When prompted, allow access to the microphone, camera, and nearby devices/Bluetooth connection. Denying microphone access prevents voice input. Denying Bluetooth connection access does not prevent the call, but a Bluetooth headset may not be available as the call audio device.

## Run on iOS

iOS builds require macOS with Xcode installed.

Install Flutter and CocoaPods dependencies:

```bash
flutter pub get
cd ios
pod install
cd ..
```

Start an iOS simulator or connect an iPhone, then run:

```bash
flutter devices
flutter run -d <device-id>
```

To run on a physical iPhone, open the following workspace in Xcode:

```text
ios/Runner.xcworkspace
```

In Xcode, select your development team under `Signing & Capabilities` and make sure the Bundle Identifier is unique. When the app first starts, allow microphone and camera access.

> Test real-time microphone, camera, WebRTC, and audio-routing behavior on physical Android and iOS devices. Simulators may not fully support these media features.

## Useful Commands

Analyze the project:

```bash
flutter analyze
```

Run tests:

```bash
flutter test
```

Clean and reinstall dependencies:

```bash
flutter clean
flutter pub get
```

Build an Android APK:

```bash
flutter build apk
```

Build the iOS app (macOS and Xcode required):

```bash
flutter build ios
```

## Troubleshooting

### The `flutter` command is not available

Make sure Flutter is installed and the Flutter SDK `bin` directory is included in your system `PATH`.

### Flutter or Dart version is incompatible

Check your installed versions:

```bash
flutter --version
flutter doctor
```

The project's `pubspec.yaml` requires Dart SDK `3.12.2` or a compatible version. Using the corresponding Flutter stable release is recommended.

### CocoaPods or iOS dependencies cannot be found

Run the following commands from the project root:

```bash
flutter clean
flutter pub get
cd ios
pod install --repo-update
cd ..
```

After installation, open `ios/Runner.xcworkspace`, not `Runner.xcodeproj`.

### The app connects but does not upload microphone audio

Check the following:

- Microphone permission is granted in the system settings.
- The console confirms that microphone recording started successfully.
- Both WebSocket and WebRTC reach the connected state.
- The NavTalk license and character configuration are valid.
- On Android, another audio application has not interrupted recording.

### The app cannot connect to NavTalk

Verify that the device has internet access and that `license`, `characterName`, or `characterId` is configured correctly. Never expose a real license in an issue, screenshot, or public log.
