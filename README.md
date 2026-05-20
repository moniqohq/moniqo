**Moniqo** is a modern financial software project focused on clarity, control, and long-term usability.

The goal is to build tools that help individuals understand, manage, and reason about their money without unnecessary complexity.

> Clarity is not a finishing step. It is the starting point.
---
## Vision

Most financial tools overwhelm users with features, dashboards, and abstractions that obscure what actually matters.

Moniqo is designed around a different principle:
- Clear mental models
- Predictable behavior
- Readable systems
- Long-term maintainability

Every decision in Moniqo prioritizes simplicity, correctness, and transparency.

---
## What Moniqo Is
  
Moniqo aims to become a **personal finance and money-management platform**, with a focus on:
- Budgeting and expense tracking
- Financial insights derived from clean data models
- Systems that are easy to reason about and extend
- A calm, minimal user experience
 
The project is intentionally opinionated and avoids feature bloat.

---
## What Moniqo Is Not

- A flashy finance app optimized for growth hacks
- A data-harvesting platform
- A cluttered dashboard with dozens of half-useful metrics

If a feature does not improve clarity, it does not belong here.

---
## Philosophy

Moniqo is built on a few non-negotiable principles:
- **Clarity over cleverness**
- **Readable codebases over dense abstractions**
- **Small, composable systems**
- **Deliberate decisions over rapid accumulation of features**

---
## Platform

Moniqo is a **multi-platform application** available on desktop and web.
- Native desktop app (macOS, Windows, Linux)
- Web application with cloud sync
- Multi-user collaboration with role-based access control
- Data is securely stored and accessible across devices

This approach prioritizes **privacy, performance, and long-term maintainability** while enabling collaboration and access from anywhere.

---
## Installation & Downloads (All Operating Systems)

Prebuilt binaries are provided for major operating systems.
#### Supported Platforms
- **macOS** (Apple Silicon & Intel)
- **Windows** (x64)    
- **Linux** (x64)    
#### Download
1. Go to the **Releases** page of this repository    
2. Download the installer or archive for your operating system    
3. Install and launch the application like any native desktop app    

> No runtime dependencies are required. Everything is bundled with the app.

---
## Architecture Overview

The application follows a **native-desktop, multi-layered architecture**:
#### Core Stack
- **Tauri** — Desktop shell and secure system bridge    
- **Go** — Backend logic, data processing, and system-level operations    
- **Svelte** — Frontend UI and state management
- SQLite — Database System
#### Inter-Layer Communication
- **Tauri communicates with Go through explicit wrapper handlers**
    - Tauri exposes a minimal set of commands        
    - Each command maps to a well-defined Go handler        
    - Handlers enforce validation, authorization, and error normalization        
- No direct database or filesystem access from the UI layer    
- All business logic and data access remain centralized in Go
    
This wrapper-based approach ensures:
- Clear API boundaries    
- Predictable data flow    
- Reduced coupling between UI and backend logic    
- Easier testing and future refactoring
#### Design Principles
- **Thin UI, strong backend**: Business logic lives in Go
- **Multi-user ready**: Role-based access control across all budgets
- **Cross-platform**: Native desktop and web clients share the same backend
- **Small binary size** compared to Electron-based apps

This architecture allows the application to feel **native, fast, and reliable** across platforms while keeping the codebase clean and understandable.
