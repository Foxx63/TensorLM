import { executeCanvasCommand, frameScene } from './app.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const SYSTEM_PROMPT = `You are an expert 3D Mathematics Tutor for Coordinate Geometry (MTH104). Your user interface is a Three.js canvas. 
The user is a student who may submit vague questions, OR upload images/screenshots of their math homework.

YOUR OBJECTIVES:
1. Decode the student's mathematical intent. If they upload an image, extract the equation, vectors, or problem described in the image.
2. Compute all coordinates natively first.
3. Construct a sequential 3D visual metaphor that breaks the solution down step-by-step.
4. Provide a warm, simple, peer-to-peer explanation.

--- TOPIC TRANSLATION MAP ---
1. PLANES: Math Concept: Intercept form x/a + y/b + z/c = 1.
   Sequence: Draw points at intercepts, draw the plane (draw_plane), add labels.
   CRITICAL FOR PLANES: You MUST set the "origin" property of the plane to a coordinate that actually lies ON the plane. Do NOT default to [0,0,0] unless the plane passes through the origin.
2. PARAMETRIC EQUATIONS/LINES: Math Concept: r(t) = P0 + t*v.
   Sequence: Plot start point P0 (draw_point). Draw the infinite line (draw_line) using direction vector v and origin P0.
3. DISTANCES: Math Concept: Perpendicular projection.
   Sequence: Draw the target plane/line, draw the floating point, draw the perpendicular distance vector (draw_vector) in red.

RULES:
1. ONLY output valid JSON. No markdown wrappers, no conversational text outside the JSON block.
2. NATIVE COMPUTATION: Compute all coordinates natively before generating commands.
3. DYNAMIC SIZING: Calculate the Maximum Absolute Coordinate (MAC). If drawing a plane, set "size" dynamically to at least (MAC * 2.5).

EXPECTED JSON SCHEMA:
{
  "message": "Step-by-step explanation...",
  "commands": [
    { "action": "clear_scene" },
    {
      "action": "draw_point",
      "id": "point_1",
      "label": "P(1,2,3)",
      "coords": [1, 2, 3],
      "color": "#ff0000"
    },
    {
      "action": "draw_vector",
      "id": "vec_1",
      "label": "Force A",
      "coords": [3, 0, 0],
      "origin": [0, 0, 0],
      "thickness": 0.08,
      "color": "#00ff00"
    },
    {
      "action": "draw_line",
      "id": "line_1",
      "label": "Line r(t)",
      "direction": [1, 2, 3],
      "origin": [0, 0, 0],
      "thickness": 0.04,
      "color": "#ffff00"
    },
    {
      "action": "draw_plane",
      "id": "plane_1",
      "label": "Plane Z",
      "normal": [0, 1, 0],
      "origin": [0, 0, 0],
      "size": 10,
      "color": "#0000ff"
    }
  ]
}`;

// UI Elements
const inputField = document.getElementById('user-input');
const sendButton = document.getElementById('send-btn');
const chatHistory = document.getElementById('chat-history');
const stepToggle = document.getElementById('step-toggle');

// Image Upload Elements
const imageUpload = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');

let currentImageBase64 = null;
let currentImageMimeType = null;

// Handle Image Selection
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            currentImageBase64 = event.target.result.split(',')[1];
            currentImageMimeType = file.type;
            imagePreview.src = event.target.result;
            imagePreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// Handle Image Removal
removeImageBtn.addEventListener('click', () => {
    currentImageBase64 = null;
    currentImageMimeType = null;
    imageUpload.value = '';
    imagePreviewContainer.classList.add('hidden');
});

function addMessageToUI(sender, text) {
    const div = document.createElement('div');
    div.className = sender === 'User' 
        ? 'bg-sky-900 p-3 rounded-lg text-sm text-slate-100 ml-8 border border-sky-700 break-words' 
        : 'bg-slate-700 p-3 rounded-lg text-sm text-slate-300 mr-8 break-words';
    div.innerHTML = `<strong>${sender}:</strong><br/>${text}`;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function handleUserInput() {
    const text = inputField.value.trim();
    
    // Validate we have either text or an image
    if (!text && !currentImageBase64) return;

    // Build the payload parts array
    const parts = [];
    if (text) {
        parts.push({ text: text });
    } else if (currentImageBase64) {
        parts.push({ text: "Please solve and plot the mathematical problem shown in this image." });
    }

    // Display user message in chat (with image thumbnail if it exists)
    let userDisplayHtml = text;
    if (currentImageBase64) {
        parts.push({
            inlineData: {
                mimeType: currentImageMimeType,
                data: currentImageBase64
            }
        });
        userDisplayHtml = `<img src="data:${currentImageMimeType};base64,${currentImageBase64}" class="h-20 rounded mb-2 border border-slate-500">` + text;
        removeImageBtn.click(); // Clear the upload UI automatically
    }

    addMessageToUI('User', userDisplayHtml);
    inputField.value = '';
    
    const loadingId = "loading-" + Date.now();
    addMessageToUI('AI', `<span id="${loadingId}">Analyzing mathematics...</span>`);

    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: SYSTEM_PROMPT }]
                },
                contents: [{
                    role: "user",
                    parts: parts
                }],
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json" 
                }
            })
        });

        const data = await response.json();
        
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl && loadingEl.parentElement) {
            loadingEl.parentElement.remove();
        }

        if (!response.ok) {
            console.error("🔴 GOOGLE API REJECTED THE REQUEST:", data);
            throw new Error(`HTTP ${response.status}: ${data.error?.message || 'Unknown API Error'}`);
        }

        const aiResponseText = data.candidates[0].content.parts[0].text;
        const parsedResponse = JSON.parse(aiResponseText);
        
        if (parsedResponse.commands) {
            const isToggleOn = stepToggle.checked;
            const promptText = text.toLowerCase();
            const hasSequencingWords = promptText.includes('step') || promptText.includes('explain') || promptText.includes('then');
            const isStepMode = isToggleOn || hasSequencingWords;

            for (const cmd of parsedResponse.commands) {
                await executeCanvasCommand(cmd);
                if (isStepMode && cmd.action !== 'clear_scene') {
                    await sleep(1500); 
                }
            }
            frameScene();
        }
        
        addMessageToUI('AI', parsedResponse.message);

    } catch (error) {
        console.error("API Error caught in try/catch:", error);
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement && loadingElement.parentElement) {
            loadingElement.parentElement.remove();
        }
        addMessageToUI('System Error', error.message);
    }
}

sendButton.addEventListener('click', handleUserInput);
inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleUserInput();
});