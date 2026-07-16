# TensorLM
Educational Vector Visualization Agent.


# AI-Powered 3D Geometry Engine

An interactive, AI-driven mathematics visualization tool built for coordinate geometry and vector analysis (e.g., MTH104). This engine translates natural language prompts and homework screenshots into fully interactive, labeled 3D mathematical simulations.

## ✨ Features

* **Natural Language to 3D:** Describe a math problem (e.g., "Find the intercepts of the plane 2x + 3y + 4z = 12") and the AI will compute the math and plot the 3D sequence automatically.
* **Multimodal Support (Homework Scanner):** Upload screenshots of math problems. The engine uses Gemini 1.5 Flash's vision capabilities to read the equations and construct the corresponding 3D scenario.
* **Interactive Drag-to-Scale:** Toggle "Drag to Scale Mode" to manually stretch planes and vectors along their defined mathematical axes without breaking their orientation.
* **Step-by-Step Educational Mode:** Slows down the rendering sequence, drawing one element at a time while providing peer-to-peer text explanations to aid learning.
* **Dynamic Auto-Framing:** The camera automatically calculates the bounding box of the scene and adjusts its FOV/zoom to perfectly frame the mathematical structure.

## 🛠️ Tech Stack

* **Frontend:** Vanilla JavaScript, HTML5, Tailwind CSS
* **3D Rendering:** [Three.js](https://threejs.org/) (WebGL, OrbitControls, TransformControls)
* **Math Computation:** [Math.js](https://mathjs.org/)
* **AI Engine:** Google Gemini 1.5 Flash (via `@google/generative-ai` REST API)
* **Backend:** Serverless Node.js (Vercel Serverless Functions)

## 📂 Project Structure

```text
├── public/                 # Frontend assets served to the browser
│   ├── index.html          # Main UI and layout (Tailwind)
│   ├── app.js              # Three.js 3D rendering and interaction engine
│   └── ai.js               # UI logic and API communication
├── api/                    # Serverless backend
│   └── gemini.js           # Secure proxy to Google Gemini API
├── .env.example            # Example environment variables
└── README.md               # Project documentation
