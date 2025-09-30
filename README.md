<div align="center">

# <img src="https://api.navtalk.ai/uploadFiles/navtalk.png" alt="NavTalk Logo" width="150" height="auto">

**Real-time Virtual Digital Human Platform**

[![API Documentation](https://img.shields.io/badge/API-Documentation-green)](https://www.navtalk.ai/docs)
[![License](https://img.shields.io/badge/License-MIT-green)](https://opensource.org/licenses/MIT)

</div>


# NavTalk Samples

> Official sample code and Software Development Kit (SDK) for **NavTalk Real-time Virtual Digital Human Platform**

Focused on building next-generation real-time digital human systems, especially suitable for intelligent customer service and virtual assistant applications.



## ✨ Core Features

With NavTalk SDK, your digital human will have the following capabilities:

- **🧠 Intelligent Conversation & Decision Making** - Core conversational abilities powered by large language models, enabling deep language understanding and multi-turn reasoning
- **🌍 Multi-language Real-time Interaction** - Supports real-time speech recognition and synthesis for 50+ languages with over 95% accuracy
- **👄 Natural Expression & Lip Sync** - Deep learning-based precise audio-lip synchronization, enhancing the naturalness and realism of digital human expressions
- **😊 Emotional Perception & Adaptation** - Through emotion recognition technology, digital humans can perceive user emotions and adjust responses accordingly, making interactions more human-like
- **🎨 Highly Customizable** - Define character personality, language style, appearance, and personalized settings to fully meet different scenario requirements
- **⚡ Low-latency Real-time Communication** - Built on WebSocket and WebRTC, ensuring end-to-end communication latency below 2000ms

### Future Roadmap

NavTalk SDK will also support more features such as **camera capture**, **online connectivity**, and more to further enhance digital human expressiveness and interactive experience.



## 📁 Project Structure

<div align="center">

```
Samples/
├── HtmlClient/          # Basic HTML client example
├── VueClient/           # Vue.js frontend example  
├── WebServer/           # Java backend service example
├── Android/             # Android mobile app example
└── iOS/                 # iOS mobile app example
```

</div>

### 📂 Directory Overview

| Directory | Description | Technology | Platform |
|:---:|:---|:---:|:---:|
| **`HtmlClient/`** | Basic HTML client demonstrating native web integration | HTML, JavaScript, CSS | 🌐 Web |
| **`VueClient/`** | Modern Vue.js frontend with component-based architecture | Vue.js, Vite, JavaScript | 🌐 Web |
| **`WebServer/`** | Java backend service with WebSocket support | Java, Spring Boot, Maven | ⚙️ Backend |
| **`Android/`** | Native Android mobile application with WebRTC | Kotlin, WebRTC, Gradle | 📱 Android |
| **`iOS/`** | Native iOS mobile application with WebRTC | Swift, WebRTC, CocoaPods | 🍎 iOS |

### 🎯 Platform Support

<div align="center">

| Platform | Status | Technology Stack | Features |
|:---:|:---:|:---:|:---:|
| 🌐 **Web** | ✅ Ready | HTML5, JavaScript, Vue.js | Real-time chat, voice interaction |
| 📱 **Android** | ✅ Ready | Kotlin, WebRTC, Gradle | Native mobile app, voice synthesis |
| 🍎 **iOS** | ✅ Ready | Swift, WebRTC, CocoaPods | Native mobile app, voice recognition |
| ⚙️ **Backend** | ✅ Ready | Java, Spring Boot, WebSocket | API server, real-time communication |

</div>


## 🚀 Quick Start

### 📋 Prerequisites

- **Node.js** (v16+) - for Vue.js frontend
- **Java** (v11+) - for backend server
- **Maven** (v3.6+) - for Java dependency management
- **Android Studio** - for Android development
- **Xcode** - for iOS development (macOS only)
- **Git** - for version control

### 1️⃣ Clone Repository

```bash
git clone https://github.com/navtalk/Samples.git
cd Samples
```

### 2️⃣ Install Dependencies

<details>
<summary><b>🌐 Web Applications</b></summary>

#### HTML Client
```bash
# No installation required - just open the HTML file
```

#### Vue.js Client
```bash
cd VueClient
npm install
```

#### Backend Server
```bash
cd WebServer
mvn clean install
```

</details>

<details>
<summary><b>📱 Mobile Applications</b></summary>

#### Android
```bash
cd Android
./gradlew build
```

#### iOS
```bash
cd iOS
pod install
```

</details>

### 3️⃣ Run Applications

<details>
<summary><b>🌐 Start Web Applications</b></summary>

#### HTML Client
```bash
# Simply open in browser
open HtmlClient/demo.html
```

#### Vue Client
```bash
cd VueClient
npm start
```

#### Backend Server
```bash
cd WebServer
mvn spring-boot:run
```

</details>

<details>
<summary><b>📱 Start Mobile Applications</b></summary>

#### Android
```bash
cd Android
./gradlew installDebug
# Or open in Android Studio and run
```

#### iOS
```bash
# Open NavTalk.xcworkspace in Xcode and run
open iOS/NavTalk.xcworkspace
```

</details>


## 📚 Documentation Resources

- **🌐 Official Website**: [NavTalk Official Website](https://www.navtalk.ai)
- **📖 API Documentation**: [NavTalk API Documentation](https://navtalk.gitbook.io/api)
- **📄 License**: [MIT License](https://opensource.org/licenses/MIT)


## 📞 Support

If you encounter any issues during use, please contact us through the following channels:

- Visit [Official Website](https://navtalk.ai/support/) for support
- Check [API Documentation](https://navtalk.gitbook.io/api) for detailed instructions

