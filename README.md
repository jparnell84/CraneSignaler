🏗️ Crane Signal Trainer (AI-Powered)A real-time computer vision application that evaluates standard Crane & Rigging hand signals using Edge AI.This app runs entirely in the browser (Client-Side) using Google MediaPipe Holistic. It tracks body pose and hand gestures to provide instant feedback to students, ensuring they are performing signals according to OSHA/ASME standards.

🚀 Key FeaturesReal-Time Evaluation: 
Analyzes arm angles and finger positions at 30 FPS.
Privacy-First (Edge AI): No video is ever sent to a server. All processing happens locally on the user's device (GPU-accelerated).
Dual Modes: * Training: Live feedback on what signal is currently detected.
Assessment: Randomized drills to test user reaction time and accuracy.
Voice Command Stub: (Beta) Structure in place to analyze voice commands alongside gestures (e.g., "Radio Check").
Mobile Compatible: Runs on modern smartphones via mobile browsers.

🛠️ Tech StackFramework: 
React + Vite (Fast build tool)
Computer Vision: MediaPipe Holistic (Pose + Hand tracking)
Styling: Tailwind CSS
Language: JavaScript (ES6+)

📦 Installation & Setup
1. Clone the repositorygit clone [https://github.com/your-username/crane-signal-trainer.git](https://github.com/your-username/crane-signal-trainer.git)
cd crane-signal-trainer

2. Install Dependenciesnpm install

3. Run Local Servernpm run dev

4. Open in BrowserClick the link provided in the terminal (usually http://localhost:5173).Note: You must allow Webcam access when prompted.📂 Project StructureWe separate the "Math" (Logic) from the "View" (React) to make it easy to add new signals./src
├── /components      # UI Elements (HUD, Buttons, Layouts)
├── /core            # The AI "Brain"
│   ├── geometry.js  # Math helpers (calculateAngle, detectThumb)
│   └── signals.js   # The definitions of every crane signal
├── App.jsx          # Main entry point
└── main.jsx         # React DOM root

🧠 How It Works
Unlike traditional "Black Box" Machine Learning, this app uses Heuristic/Geometric Analysis. This makes the grading explainable and easier to debug.
Example Logic for "RAISE BOOM":
1. Pose Check: Is the arm extended? (Elbow Angle > 145°)
2. Hand Check: Is the thumb pointing UP relative to the index knuckle?
3. Result: If both are true → PASS.

Adding New Signals
To add a new signal, open src/core/signals.js and add a new rule:
'DOG_EVERYTHING': (pose, leftHand, rightHand) => {
    // 1. Calculate distance between wrists
    const distance = calculateDistance(pose[15], pose[16]);
    // 2. Check if hands are clasped (distance is small)
    return distance < 0.1; 
}

📱 Mobile Support
This app uses WebAssembly (WASM) to access the device's GPU.
Performance: Works best on iPhone 11+ / Pixel 5+ or newer.
Orientation: Optimized for Portrait mode (Selfie camera).
Network: Offline-capable after initial load.
