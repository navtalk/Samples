# NavTalk Samples

本仓库是 **NavTalk 实时虚拟数字人平台** 的官方示例代码和软件开发工具包（SDK），专注于构建下一代实时数字人系统，尤其适用于智能客服和虚拟助手等领域。

[![API Documentation](https://img.shields.io/badge/API-Documentation-green)](https://www.navtalk.ai/docs)
[![License](https://img.shields.io/badge/License-MIT-green)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)](https://github.com/navtalk/Samples/actions)

## ✨ 核心特性

通过 NavTalk SDK，您的数字人将拥有以下能力：

-  **智能对话与决策** - 核心对话能力由大语言模型驱动，实现深度的语言理解和多轮推理。
-  **多语言实时交互** - 支持 50+ 语言的实时语音识别与合成，准确率超过 95%。
-  **自然表情与口型同步** - 基于深度学习实现精准的音频-口型同步，提升数字人表达的自然度和真实感。
-  **情感感知与自适应** - 通过情感识别技术，数字人能够感知用户的情绪并根据情绪调整回应方式，使互动更加贴近人类的沟通方式。
-  **高度可定制化** - 可定义角色的人格、语言风格、外观和个性化设置，完全满足不同场景的需求。
-  **低延迟实时通信** - 基于 WebSocket 和 WebRTC 构建，确保端到端的通信延迟低于 2000ms，适应实时交互场景。

未来，NavTalk SDK 还将支持更多功能，如**摄像头捕捉**、**在线联网**等，进一步提升数字人的表现力和互动体验。

## 📁 项目结构

该仓库包含以下主要目录和文件：

- **`HtmlClient/`**：基础的 HTML 客户端示例，展示了如何使用原生 HTML 和 JavaScript 构建前端应用。
- **`VueClient/`**：基于 Vue.js 的前端示例，展示了如何使用 Vue.js 构建现代化的前端应用。
- **`WebServer/`**：一个简单的 Web 服务器示例，展示了如何使用 Java 构建后端服务来与前端进行交互。


## 🛠️ 技术栈

- **前端**：HTML, JavaScript, Vue.js
- **后端**：Java（使用 Maven 管理依赖）

## 🚀 快速开始

### 1. 克隆仓库

首先，克隆本仓库到本地：
`git clone https://github.com/navtalk/Samples.git`
### 2. 安装依赖

- 对于 **VueClient/**，您需要安装前端依赖：
`cd VueClient
npm install`
- 对于 **WebServer/**，您需要使用 Maven 来安装后端依赖：
`cd WebServer
mvn install`
### 3. 运行项目
- **前端**：根据项目配置，运行 Vue 客户端或 HTML 客户端来启动前端应用。
- **后端**：运行 Java 后端服务，启动 Web 服务器：
根据不同的项目结构和需求，启动相应的前端和后端服务以进行开发和测试。

## 📄 许可协议

该项目使用 [MIT 许可证](https://opensource.org/licenses/MIT)。


## 🌐 官方网站

有关 NavTalk SDK 的更多信息，请访问 [NavTalk 官方网站](https://www.navtalk.ai)。

## 📜 API 文档

为了更好地理解 NavTalk 的 API，您可以参考我们的官方文档：[NavTalk API 文档](https://www.navtalk.ai/docs) 📖.

