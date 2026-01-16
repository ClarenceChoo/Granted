# Granted - Developer Guide

Welcome to **Granted**! This repository contains the source code for the "Granted" AI Grant Discovery platform. This guide is designed to help you get the project up and running on your local machine, even if you are new to web development.

## 🚀 Quick Start for Beginners

### 1. Prerequisites
Before you begin, make sure you have the following installed on your computer:

-   **Node.js**: The environment to run the frontend code.
    -   [Download Node.js](https://nodejs.org/) (Recommended: LTS version)
    -   Verify install: Open terminal/command prompt and type `node -v`
-   **Git**: To download this repository.
    -   [Download Git](https://git-scm.com/downloads)

### 2. Download the Project
Open your terminal (Command Prompt on Windows, Terminal on Mac/Linux) and run these commands:

```bash
# Clone the repository (download the files)
git clone https://github.com/ClarenceChoo/Granted.git

# Enter the project folder
cd Granted
```

---

## 💻 Running the Frontend

The user interface (what you see in the browser) lives in the `frontend` folder.

### Step 1: Navigate to Frontend Directory
```bash
cd frontend
```

### Step 2: Install Dependencies
This downloads all the third-party libraries we use (like React, Tailwind CSS, etc).
```bash
npm install
```
*Note: This might take a minute. If you see warnings, it's usually okay to ignore them unless it says "Error".*

### Step 3: Start the Development Server
```bash
npm run dev
```

### Step 4: Open in Browser
You should see a message like:
`  ➜  Local:   http://localhost:5173/`

Copy that URL and paste it into Chrome, Edge, or Safari. You should see the Granted website!

---

## 📁 Project Structure

This project is a **Monorepo**, meaning it holds code for different parts of the application in one place.

```text
Granted/
├── frontend/       # The website code (React + TypeScript)
│   ├── src/        # All the source code you'll edit
│   └── public/     # Static assets like images
├── backend/        # The server code (Coming Soon)
└── README.md       # This file
```

## 🛠 Common Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the local dev server. Use this while coding. |
| `npm run size` | Checks the size of the application. |
| `npm run lint` | Checks your code for style errors. |
| `npm run build` | Builds the app for production (creates a `dist` folder). |

## ❓ FAQ & Troubleshooting

**Q: `npm install` failed with errors.**
A: Make sure you have Node.js installed. Try deleting the `node_modules` folder and `package-lock.json` file inside `frontend`, then run `npm install` again.

**Q: The port 5173 is already in use.**
A: Vite (our build tool) will automatically try the next available port (e.g., 5174). Look at the terminal output to see which URL to use.

**Q: How do I stop the server?**
A: In your terminal, press `Ctrl + C` to stop the running process.

---

*Happy Coding! 🚀*
