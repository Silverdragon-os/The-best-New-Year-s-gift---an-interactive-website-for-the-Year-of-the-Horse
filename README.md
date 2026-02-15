# 🐎 Stellar Steed: An Interactive 3D Lunar New Year Experience

> **Experience the magic where Computer Vision meets 3D Generative Art.** > **当计算机视觉遇见 3D 生成艺术，在星空中唤醒你的祥瑞金马。**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Three.js](https://img.shields.io/badge/Three.js-r160-black)](https://threejs.org/)
[![MediaPipe](https://img.shields.io/badge/AI-MediaPipe-blue)](https://google.github.io/mediapipe/)

---

## 🌟 项目简介 / Overview

**Stellar Steed** 是一款基于 Web 端的沉浸式交互视觉装置。本项目专为马年新春设计，融合了高级 3D 粒子系统与实时手势识别技术。

用户无需安装任何插件，仅需通过浏览器摄像头，即可用手势在虚拟星空中“凝聚”出奔腾的金马，或将其“引爆”化作绚烂的照片墙。

---

## 🚀 核心功能 / Key Features

* **手势交互 (Gesture Control)**
    * ✊ **握拳 (Fist)**：凝聚星尘，唤醒祥瑞金马。
    * 🖐️ **开掌 (Palm)**：金马绽放，幻化为 3D 照片墙。
* **动态粒子物理 (Dynamic Particles)**
    * 支持 **15,000+** 交互粒子，具备呼吸感动画与爆炸物理算法。
* **实时音效合成 (Audio Synthesis)**
    * 基于 **Web Audio API** 实时合成空灵音效，无需加载外部音频文件。
* **多端性能优化 (Performance)**
    * 智能检测设备类型，为移动端自动缩减粒子规模，确保全平台 **60FPS** 流畅运行。

---

## 🛠️ 技术栈 / Technical Stack

| 技术 | 用途 |
| :--- | :--- |
| **Three.js** | 核心 3D 渲染、粒子系统及后期处理特效 (UnrealBloom) |
| **MediaPipe** | Google视觉模型，实现端侧高精度手势追踪 |
| **Web Audio API** | 实现非采样、纯代码生成的实时音效 |
| **Vanilla JS** | 原生 JavaScript (ES Modules) 编写，极致轻量 |

---

## 🎮 快速开始 / Quick Start

由于本项目涉及摄像头访问及 ES 模块加载，**必须在服务器环境（Localhost）下运行**：

### 1. 使用 VS Code (推荐)
1. 下载项目文件至本地文件夹。
2. 在 VS Code 中安装 **Live Server** 插件。
3. 右键点击 `index.html` 选择 **"Open with Live Server"**。

### 2. 使用 Python 快速启动
```bash
# 在项目目录下运行
python -m http.server 8000

This project is licensed under the MIT License. Feel free to use, modify, and share.
Inspired by the spirit of the Lunar New Year 2026，Happy New Year all my friends.
