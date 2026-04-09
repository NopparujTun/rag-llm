# PrepDeck AI 🚀

**AI-Powered Interview Flashcard Coach** — Turn your resume and job descriptions into targeted, contextual interview flashcards using generative AI and Retrieval-Augmented Generation (RAG).

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Core Technologies](#core-technologies)
- [Prerequisites](#prerequisites)
- [Installation \& Setup](#installation--setup)
- [Environment Configuration](#environment-configuration)
- [Development Server](#development-server)
- [Project Structure](#project-structure)
- [Architecture \& Technical Details](#architecture--technical-details)
- [API Reference](#api-reference)
- [Docker Configuration](#docker-configuration)
- [Usage Guide](#usage-guide)
- [Assumptions \& Limitations](#assumptions--limitations)
- [License](#license)
- [Resource Links](#resource-links)

---

## Project Overview

PrepDeck AI is a full-stack, cross-platform mobile application that helps candidates prepare for technical interviews. Users can upload their PDF resume or paste a job description, and the app generates a personalised deck of interview flashcards powered by large language models (Llama 3 via Groq / OpenRouter) and semantic search (RAG).

The project is organised as a **monorepo** containing two workspaces:

- **Frontend** — An Expo / React Native mobile app with file-based routing, interactive flashcard practice, and a conversational AI coach.
- **Backend** — A FastAPI Python service that handles PDF parsing, text embedding, LLM orchestration, and all data persistence through Supabase.

---

## Key Features

| Feature                               | Description                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Resume & Job Description Analysis** | Upload a PDF resume or paste a job description to automatically extract key skills and requirements.         |
| **AI-Powered Flashcard Generation**   | Generates contextual interview questions, best-practice answers, and tracked skills using Llama 3.           |
| **Interactive Practice Mode**         | Swipe-and-flip flashcard experience with progress tracking (Known vs. Needs Review).                         |
| **Conversational AI Assistant**       | Chat with an AI coach to deep-dive into specific flashcard topics or ask follow-up questions.                |
| **Session Library & Management**      | Browse, rename, and delete saved sessions with accuracy statistics.                                          |
| **Aggregate Insights Dashboard**      | View overall performance metrics: average accuracy, total sessions, and cards studied.                       |
| **Auth & Profile Management**         | Email/password authentication with Supabase Auth, including sign-up with email confirmation.                 |
| **Pull-to-Refresh**                   | Native pull-to-refresh support across all screens.                                                           |
| **RAG-Enhanced Generation**           | Retrieval-Augmented Generation using sentence embeddings and Supabase vector search for contextual accuracy. |
| **LLM Failover**                      | Automatic fallback from Groq to OpenRouter if the primary provider is unavailable.                           |

---

## Core Technologies

### Frontend

| Technology                                                                     | Version | Purpose                                             |
| ------------------------------------------------------------------------------ | ------- | --------------------------------------------------- |
| [React Native](https://reactnative.dev/)                                       | 0.81.5  | Cross-platform mobile framework                     |
| [Expo](https://expo.dev/)                                                      | SDK 54  | Managed workflow, build tooling, and native modules |
| [Expo Router](https://docs.expo.dev/router/)                                   | 6.x     | File-based routing and navigation                   |
| [TypeScript](https://www.typescriptlang.org/)                                  | 5.9     | Static type safety                                  |
| [Supabase JS](https://supabase.com/docs/reference/javascript/)                 | 2.x     | Auth client and database access                     |
| [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) | 4.x     | Performant card-flip animations                     |
| [Expo Secure Store](https://docs.expo.dev/versions/latest/sdk/securestore/)    | 15.x    | Secure session token persistence on native          |

### Backend

| Technology                                           | Purpose                                            |
| ---------------------------------------------------- | -------------------------------------------------- |
| [FastAPI](https://fastapi.tiangolo.com/)             | Async Python REST API framework                    |
| [Python](https://www.python.org/)                    | 3.10+ runtime                                      |
| [Groq API](https://groq.com/)                        | Primary LLM inference (Llama 3 8B)                 |
| [OpenRouter](https://openrouter.ai/)                 | Fallback LLM inference (Llama 3 8B Instruct)       |
| [Supabase](https://supabase.com/)                    | PostgreSQL database, vector search, and auth       |
| [Sentence Transformers](https://www.sbert.net/)      | Text embedding for RAG (`all-MiniLM-L6-v2`)        |
| [PyPDF2](https://pypi.org/project/PyPDF2/)           | PDF text extraction                                |
| [json-repair](https://pypi.org/project/json-repair/) | Robust JSON parsing for LLM output                 |
| [Pydantic](https://docs.pydantic.dev/)               | Request/response validation and LLM output schemas |
| [httpx](https://www.python-httpx.org/)               | Async HTTP client for LLM provider calls           |
| [Docker](https://www.docker.com/)                    | Containerisation for production deployment         |

---

## Prerequisites

Before you begin, ensure you have the following installed:

**Frontend:**

- **Node.js** ≥ 18.x — [Download](https://nodejs.org/)
- **npm** ≥ 9.x (bundled with Node.js)
- **Expo CLI** — Installed globally or used via `npx`
- **Expo Go** app on your physical device — [iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)

**Backend:**

- **Python** ≥ 3.10 — [Download](https://www.python.org/downloads/)
- **pip** (bundled with Python)
- **Docker** (optional, for containerised deployment) — [Download](https://www.docker.com/get-started/)

**External Services:**

- A configured **Supabase** project with the required tables (`sessions`, `flashcards`) and the `match_embeddings` PostgreSQL RPC function
- A **Groq** API key — [Console](https://console.groq.com/)
- An **OpenRouter** API key (fallback) — [Dashboard](https://openrouter.ai/)

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd PrepDeckApp
```

### 2. Frontend Setup (Expo React Native)

```bash
# Install Node dependencies
npm install
```

### 3. Backend Setup (FastAPI)

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
venv\Scripts\activate           # Windows

# Install Python dependencies
pip install fastapi uvicorn python-dotenv PyPDF2 httpx supabase sentence-transformers json-repair pydantic

# Start the development server
uvicorn main:app --reload --port 8000
```

> **Note:** The `requirements.txt` file is currently empty. Use the `pip install` command above to install all required packages, or generate a lockfile with `pip freeze > requirements.txt` after installation.

---

## Environment Configuration

### Frontend `.env`

Create a `.env` file in the **project root** (`PrepDeckApp/`):

```env
# Backend API endpoint
EXPO_PUBLIC_API_URL=http://localhost:8000

# Supabase credentials
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend `.env`

Create a `.env` file inside the **`backend/`** directory:

```env
# Supabase (service role key — server-side only)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# LLM Providers
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

> **⚠️ Physical Device Testing:** `http://localhost:8000` will not resolve on physical devices. Replace it with your machine's LAN IP address (e.g., `http://192.168.1.5:8000`) or use a tunnelling service like [ngrok](https://ngrok.com/) / [LocalTunnel](https://localtunnel.github.io/www/).

---

## Development Server

### Start the Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the interactive Swagger documentation.

### Start the Frontend

```bash
# From the project root
npx expo start
```

From the terminal you can then:

| Key     | Action                      |
| ------- | --------------------------- |
| `a`     | Open on Android emulator    |
| `i`     | Open on iOS simulator       |
| `w`     | Open in web browser         |
| Scan QR | Open with Expo Go on device |

---

## Project Structure

```
PrepDeckApp/
├── app/                              # Expo Router — file-based routing
│   ├── _layout.tsx                   # Root layout (AuthProvider + auth redirects)
│   ├── practice.tsx                  # Flashcard practice screen
│   ├── session-insights.tsx          # Post-session insights screen
│   ├── (auth)/                       # Authentication flow (unauthenticated)
│   │   ├── _layout.tsx               # Auth stack layout
│   │   ├── login.tsx                 # Login screen
│   │   └── signup.tsx                # Sign-up screen
│   └── (tabs)/                       # Main app tabs (authenticated)
│       ├── _layout.tsx               # Tab navigator layout
│       ├── index.tsx                 # Home — create sessions from resume/JD
│       ├── library.tsx               # Session library — browse, rename, delete
│       ├── insights.tsx              # Aggregate performance insights
│       └── profile.tsx               # User profile & settings
│
├── components/                       # Reusable UI components
│   ├── AIAssistantScreen.tsx         # Chat interface for the AI coach
│   ├── BottomTabBar.tsx              # Custom bottom navigation bar
│   ├── FlashcardPracticeScreen.tsx   # Flip-card practice interface
│   ├── SessionInsightsScreen.tsx     # Session results & stats display
│   └── types.ts                      # Shared TypeScript type definitions
│
├── contexts/                         # React context providers
│   └── AuthContext.tsx               # Authentication state management
│
├── lib/                              # Core utilities & services
│   ├── api.ts                        # Backend API client (fetch-based)
│   ├── authService.ts                # Supabase auth wrapper methods
│   └── supabase.ts                   # Supabase client initialisation
│
├── backend/                          # FastAPI backend service
│   ├── main.py                       # API endpoints, LLM service, RAG pipeline
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                    # Production container configuration
│   └── .env                          # Backend environment variables
│
├── assets/                           # Static images & fonts
├── scripts/                          # Utility scripts
│   └── reset-project.js              # Expo project reset script
│
├── .env                              # Frontend environment variables
├── app.json                          # Expo configuration
├── package.json                      # Node dependencies & scripts
├── tsconfig.json                     # TypeScript configuration
└── eslint.config.js                  # ESLint configuration
```

---

## Architecture & Technical Details

### Navigation

The app uses **Expo Router** with file-based routing organised into three route groups:

- **`(auth)`** — Unauthenticated screens (login, sign-up). Protected users are automatically redirected away.
- **`(tabs)`** — The main authenticated experience with four bottom tabs: Home, Library, Insights, and Profile.
- **Root-level screens** — `practice.tsx` and `session-insights.tsx` are presented as stack screens pushed on top of the tab navigator.

Auth-based navigation is handled declaratively in the root `_layout.tsx` by observing the `useAuth()` hook and redirecting based on session state.

### Authentication

Authentication is powered by **Supabase Auth** with email/password credentials. Session tokens are securely persisted on native platforms via `expo-secure-store`, with automatic key encoding to stay within SecureStore's limits. The `AuthContext` provider broadcasts auth state changes app-wide via React Context.

### Backend Pipeline

The backend (`backend/main.py`) implements a multi-stage pipeline for flashcard generation:

```
Input (PDF/Text) → Text Extraction → RAG Context Retrieval → LLM Prompt → JSON Parsing → Database Storage
```

1. **Text Extraction** — PDF resumes are parsed with `PyPDF2`; job descriptions are accepted as plain text.
2. **RAG Context Retrieval** — The extracted text is encoded into a vector using `all-MiniLM-L6-v2` and queried against Supabase's `match_embeddings` RPC to retrieve the top 5 most relevant context passages.
3. **LLM Prompt Construction** — A structured prompt with XML-tagged rules, JSON schema, and examples is built to guide the Llama 3 model.
4. **LLM Generation with Failover** — The prompt is sent to **Groq** (primary) with automatic fallback to **OpenRouter** if Groq fails.
5. **Robust JSON Parsing** — The raw LLM output is sanitised using `json_repair` and validated against a Pydantic schema (`LLMResponseModel`). Failed attempts are retried up to 2 times.
6. **Database Persistence** — A new session is created in the `sessions` table, and all generated flashcards are bulk-inserted into the `flashcards` table.

### Flashcard Animation

Cards use a spring-based flip animation powered by **React Native's `Animated` API**. The front face displays the interview question, and the back face reveals the model answer along with associated skill tags. Action buttons (Known / Needs Review) appear only after the card is flipped.

### AI Chat

The conversational AI assistant sends the full chat history along with the current flashcard topic to the `/chat` endpoint. The backend constructs a system prompt that contextualises the LLM as an interview coach, then forwards the conversation to Groq (or OpenRouter as fallback) with a higher temperature (0.7) for more natural responses.

---

## API Reference

All endpoints are served by the FastAPI backend at `http://localhost:8000`.

| Method   | Endpoint                            | Description                                                       |
| -------- | ----------------------------------- | ----------------------------------------------------------------- |
| `GET`    | `/`                                 | Health check — returns API version                                |
| `POST`   | `/generate-from-resume`             | Upload a PDF resume and generate flashcards (multipart/form-data) |
| `POST`   | `/generate-from-jobs`               | Generate flashcards from job description text (JSON)              |
| `GET`    | `/sessions`                         | List all sessions with card counts and accuracy                   |
| `GET`    | `/sessions/{session_id}/flashcards` | Fetch all flashcards for a specific session                       |
| `PATCH`  | `/sessions/{session_id}`            | Update a session's display name                                   |
| `DELETE` | `/sessions/{session_id}`            | Delete a session and all its flashcards                           |
| `PATCH`  | `/flashcards/{flashcard_id}/status` | Update a flashcard's status (`known` / `review`)                  |
| `POST`   | `/chat`                             | Send conversation history to the AI coach and receive a reply     |

> **Tip:** Visit `http://localhost:8000/docs` for the auto-generated interactive Swagger UI.

---

## Docker Configuration

The backend includes a `Dockerfile` for production deployment using a lightweight `python:3.10-slim` base image.

### Build & Run

```bash
cd backend

# Build the Docker image
docker build -t prepdeck-api .

# Run the container
docker run -p 8000:8000 --env-file .env prepdeck-api
```

### Dockerfile Details

| Stage                  | Purpose                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| **Base image**         | `python:3.10-slim` — Minimal Python runtime                                                        |
| **Dependencies**       | Installs from `requirements.txt` via pip                                                           |
| **Model pre-download** | Pre-downloads the `all-MiniLM-L6-v2` model during build to eliminate cold-start latency at runtime |
| **Entrypoint**         | `uvicorn main:app --host 0.0.0.0 --port 8000`                                                      |

> **Note:** The embedding model (~90 MB) is baked into the Docker image at build time. This avoids a ~30s cold-start download on first request when deployed to services like Google Cloud Run or Hugging Face Spaces.

---

## Usage Guide

1. **Start both servers** — Launch the FastAPI backend (`uvicorn main:app --reload --port 8000`) and then start the Expo dev server (`npx expo start`).
2. **Sign up or log in** — Create an account on the authentication screen.
3. **Create a session** — On the Home tab, choose between uploading a PDF resume or pasting a job description, then tap **Generate Flashcards**.
4. **Practice** — Flip through the generated flashcards. Tap a card to reveal the answer, then mark it as **Known** or **Needs Review**.
5. **Ask AI** — Tap **"Ask AI about this topic"** on any card to open the conversational AI coach for deeper explanations.
6. **Review progress** — Visit the **Insights** tab to see your aggregate accuracy, session count, and total cards studied.
7. **Manage sessions** — Use the **Library** tab to browse, rename, or delete past sessions.

---

## Assumptions & Limitations

- **Supabase Schema** — The application assumes a pre-configured Supabase database with `sessions` and `flashcards` tables, as well as a PostgreSQL function `match_embeddings` for vector similarity search.
- **Content Truncation** — The backend truncates PDF resume extractions to **3,000 characters** and job descriptions to **1,500 characters** to optimise LLM token usage.
- **Empty `requirements.txt`** — The Python dependencies file is currently empty. Install packages manually or generate it with `pip freeze > requirements.txt`.
- **Local Networking** — `http://localhost:8000` will not resolve on physical devices. Use your machine's LAN IP or a tunnelling service.
- **Expo Go Compatibility** — This project uses the Expo managed workflow and is designed to run within the Expo Go app. Custom native modules would require a development build.
- **CORS** — The backend allows all origins (`*`) via CORS middleware. Restrict this in production environments.

---

## License

This project is currently unlicensed. All rights reserved unless otherwise stated.

---

## Resource Links

| Resource              | URL                           |
| --------------------- | ----------------------------- |
| Expo Documentation    | https://docs.expo.dev/        |
| Expo Router Docs      | https://docs.expo.dev/router/ |
| React Native Docs     | https://reactnative.dev/docs/ |
| FastAPI Documentation | https://fastapi.tiangolo.com/ |
| Supabase Docs         | https://supabase.com/docs     |
| Groq Console          | https://console.groq.com/     |
| OpenRouter            | https://openrouter.ai/        |
| Sentence Transformers | https://www.sbert.net/        |
| Docker Documentation  | https://docs.docker.com/      |
