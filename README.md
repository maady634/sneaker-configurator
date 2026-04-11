# Sneaker Configurator – Full Stack 3D Web Application + Unity WebGL + .NET backend

<img width="1919" height="1079" alt="Screenshot 2026-04-09 091509" src="https://github.com/user-attachments/assets/0fb2d2f1-95e4-47a8-a5c0-ff95f62cacb8" />

A browser-based 3D sneaker configurator built using Unity WebGL, React, and .NET 9. This project demonstrates how immersive 3D applications can be integrated into modern web systems with real-time interaction and backend persistence.

---

## Live Demo

https://sneaker-configurator-tau.vercel.app/

---

## Overview

This application allows users to customize a 3D sneaker directly in the browser. Users can modify individual parts, apply colors, switch material finish, and save or load configurations using a unique identifier.

This project is designed to reflect real-world enterprise use cases such as product visualization, digital configurators, and immersive web experiences.

---

## Features

- Real-time 3D customization using Unity WebGL  
- Part-based editing (Body, Top, Cover, Laces)  
- Color selection with swatches and custom hex input  
- Matte and Glossy finish toggle  
- Save configurations with unique ID  
- Load and restore saved configurations  
- Seamless React ↔ Unity communication  

---

## Architecture

The system is structured into four layers:

### 1. Unity (WebGL)
Handles 3D rendering, material updates, and camera interaction. Exposes public C# methods for runtime control.

### 2. React (Frontend)
Manages UI, user interaction, and application state. Sends commands to Unity and communicates with backend APIs.

### 3. React-Unity-WebGL (Bridge)
Connects React and Unity, enabling method calls between JavaScript and C#.

### 4. .NET 9 API (Backend)
Provides REST endpoints to save and retrieve configurations using SQLite and Entity Framework Core.

---

## Tech Stack

- Unity 2022 LTS (URP)
- C#
- WebGL
- React 18 + JavaScript
- react-unity-webgl
- Vite
- .NET 9 Minimal API
- Entity Framework Core
- SQLite
- Docker (deployment)
- Railway (API hosting)
- Vercel (frontend hosting)

---

## How It Works

1. User interacts with UI (React)
2. React sends commands to Unity using `sendMessage`
3. Unity updates the 3D model in real time
4. User saves configuration → React calls API
5. API stores data and returns unique ID
6. Loading the ID restores the full configuration

---

## Key Technical Highlights

- Uses `MaterialPropertyBlock` for efficient runtime material updates  
- Real-time communication between React and Unity WebGL  
- Clean separation between UI, 3D engine, and backend  
- Optimized for browser-based performance  
- Environment-based API configuration  

---

## Getting Started

### Prerequisites
- Node.js
- .NET 9 SDK
- Unity 2022 LTS

---

### Frontend (React)

```bash
cd sneaker-configurator-react
npm install
npm run dev
