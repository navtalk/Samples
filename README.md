<div align="center">

# <img src="https://api.navtalk.ai/uploadFiles/navtalk.png" alt="NavTalk Logo" width="150" height="auto">

**Real-time Virtual Digital Human Platform**

<a href="https://www.navtalk.ai/docs" target="_blank" rel="noopener noreferrer">
  <img src="https://img.shields.io/badge/API-Documentation-green" alt="API Documentation Badge">
</a>
<a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License Badge">
</a>

</div>


# NavTalk Samples

> Official sample code and Software Development Kit (SDK) for the **NavTalk Real-time Virtual Digital Human Platform**.

NavTalk provides everything you need to build immersive, real-time digital human experiences. These samples demonstrate how to
integrate NavTalk across web, mobile, and backend applications, making it ideal for intelligent customer service and virtual
assistant scenarios.



## ✨ Core Features

NavTalk SDK enables your digital human applications with:

| Capability | Description |
| --- | --- |
| 🧠 Intelligent Conversation & Decision Making | Large language models deliver deep language understanding and multi-turn reasoning. |
| 🌍 Multi-language Real-time Interaction | Supports real-time speech recognition and synthesis for 50+ languages with over 95% accuracy. |
| 👄 Natural Expression & Lip Sync | Deep learning-powered lip synchronization makes on-screen avatars feel natural and expressive. |
| 😊 Emotional Perception & Adaptation | Emotion recognition detects user sentiment and adjusts responses for human-like interactions. |
| 🎨 Highly Customizable | Tune persona, tone, appearance, and other settings to match any scenario. |
| ⚡ Low-latency Real-time Communication | WebSocket/WebRTC architecture keeps end-to-end latency below 2000 ms. |

### Future Roadmap

NavTalk SDK will also support more features such as **camera capture**, **online connectivity**, and more to further enhance digital human expressiveness and interactive experience.



## Project Structure

```
Samples/
├── Avatars/             # Downloadable avatar reference videos
├── Expo/                # React Native Expo experience mirroring the iOS demo
├── HtmlClient/          # Basic HTML client example
├── ReactClient/         # React frontend example built with Vite
├── VueClient/           # Vue.js frontend example
├── WebServer/           # Java backend service example
├── Android/             # Android mobile app example
├── Flutter/             # Flutter cross-platform mobile sample
└── iOS/                 # iOS mobile app example
```

### Directory Overview

- **`Avatars/`** – Reference MP4 clips for customizing avatar appearances.
- **`Expo/`** – React Native Expo experience that mirrors the native iOS demo layout and flow.
- **`HtmlClient/`** – Minimal HTML implementation for quick WebSocket/WebRTC testing.
- **`ReactClient/`** – React + Vite front-end showcasing a modern component workflow.
- **`VueClient/`** – Component-based Vue.js front-end with a richer UI experience.
- **`WebServer/`** – Java backend service with WebSocket support and integration examples.
- **`Android/`** – Native Android app demonstrating mobile real-time communication via WebRTC.
- **`Flutter/`** – Cross-platform Flutter client mirroring the mobile experience.
- **`iOS/`** – Native iOS app mirroring Android functionality with platform-specific tooling.


## Quick Start

### Prerequisites

| Tool | Purpose |
| --- | --- |
| Node.js (v16+) | Required for the Vue.js and React front-ends. |
| Java (v11+) | Required for the backend server. |
| Maven (v3.6+) | Java dependency management and builds. |
| Android Studio | Android development environment. |
| Xcode | iOS development (macOS only). |
| Git | Version control and repository cloning. |

### 1. Clone the repository

```bash
git clone https://github.com/navtalk/Samples.git
cd Samples
```

### 2. Install dependencies

**Web Applications**

| Project | Commands |
| --- | --- |
| HTML Client | No installation required—open the HTML file directly. |
| Expo App | `cd Expo && npm install` |
| Vue.js Client | `cd VueClient && npm install` |
| React Client | `cd ReactClient && npm install` |
| Backend Server | `cd WebServer && mvn clean install` |

**Mobile Applications**

| Platform | Commands |
| --- | --- |
| Android | `cd Android && ./gradlew build` |
| iOS | `cd iOS && pod install` |

### 3. Run the samples

**Web Applications**

| Project | How to run |
| --- | --- |
| HTML Client | Open `HtmlClient/demo.html` in your browser. |
| Vue Client | `cd VueClient && npm start` |
| React Client | `cd ReactClient && npm start` |
| Expo App | `cd Expo && npm start` (runs the Expo Dev Server; use Expo Go or simulators to load) |
| Backend Server | `cd WebServer && mvn spring-boot:run` |

**Mobile Applications**

| Platform | How to run |
| --- | --- |
| Android | `cd Android && ./gradlew installDebug` or run from Android Studio. |
| iOS | Open `iOS/NavTalk.xcworkspace` in Xcode and run on a simulator or device. |


## Documentation & Support

- **Official Website** – <a href="https://www.navtalk.ai" target="_blank" rel="noopener noreferrer">navtalk.ai</a>
- **API Documentation** – <a href="https://navtalk.gitbook.io/api" target="_blank" rel="noopener noreferrer">NavTalk API Documentation</a>
- **License** – <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer">MIT License</a>

## Demo Videos

<div align="center">
  <table>
    <tr>
      <td>
        <a href="https://www.youtube.com/watch?v=YoyZqpvqzPE" target="_blank" rel="noopener noreferrer" title="Watch the NavTalk Platform Overview" onclick="window.open(this.href, '_blank', 'noopener,noreferrer'); return false;">
          <img src="https://img.youtube.com/vi/YoyZqpvqzPE/hqdefault.jpg" alt="NavTalk Platform Overview" width="320">
        </a>
      </td>
      <td>
        <a href="https://www.youtube.com/watch?v=ja3YgHNaPWc" target="_blank" rel="noopener noreferrer" title="Watch the NavTalk In-depth Walkthrough" onclick="window.open(this.href, '_blank', 'noopener,noreferrer'); return false;">
          <img src="https://img.youtube.com/vi/ja3YgHNaPWc/hqdefault.jpg" alt="NavTalk In-depth Walkthrough" width="320">
        </a>
      </td>
    </tr>
    <tr>
      <td align="center"><em>NavTalk Platform Overview</em></td>
      <td align="center"><em>NavTalk In-depth Walkthrough</em></td>
    </tr>
  </table>
</div>

Need help? Visit the <a href="https://navtalk.ai/support/" target="_blank" rel="noopener noreferrer">support portal</a> or consult the <a href="https://navtalk.gitbook.io/api" target="_blank" rel="noopener noreferrer">API documentation</a> for detailed guides and troubleshooting tips.


## Contributing

We welcome feedback and community contributions that improve these samples. To propose a change:

1. Fork the repository and create a feature branch.
2. Make your updates, ensuring code style and lint rules for the specific platform are followed.
3. Test your changes locally (web clients with `npm run build`, mobile projects with the respective IDE or CLI tools, and the Java backend using `mvn test`).
4. Submit a pull request summarizing the motivation and verification steps.

If you find a bug or have an enhancement idea but cannot submit code, please <a href="https://github.com/navtalk/Samples/issues" target="_blank" rel="noopener noreferrer">open an issue</a> with as much detail as possible (logs, steps to reproduce, expected vs. actual behavior, environment info, etc.).


## Troubleshooting Checklist

Before opening an issue, verify the following common fixes:

- **Environment Versions** – Ensure the Node.js, Java, Android Studio, Xcode, and Flutter SDK versions match the prerequisites listed above.
- **Dependency Installs** – Delete lockfiles and `node_modules`/`Pods` directories if package installs fail, then reinstall (`npm install`, `pod install`, etc.).
- **WebRTC Permissions** – When testing in browsers or on mobile, allow microphone/camera access or provide mock input sources to avoid connection failures.
- **Backend Connectivity** – Confirm the WebServer sample is reachable and configured with valid NavTalk credentials before running web or mobile clients.
- **Gradle/CocoaPods Caches** – Clear caches (`./gradlew clean`, `pod cache clean --all`) if builds behave inconsistently after updates.

