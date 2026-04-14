# Voyagr - AI Travel Agent ✈️

**🌍 Live Demo:** [[https://grand-twilight-d24778.netlify.app/](https://grand-twilight-d24778.netlify.app/](https://voyagrai.netlify.app/))

Voyagr is a full-stack, AI-powered travel booking application that provides a modern, conversational interface for planning and booking trips. It uses the Groq API (Llama 3) to process natural language requests, offer tailored flight and hotel options, and finalize itinerary bookings, which are then saved persistently.

## Features
- **Conversational AI Planning**: Chat with Voyagr to discover destinations, compare options, and confirm itineraries.
- **Dynamic Frontend**: Modern UI with a glassmorphism design, interactive chat bubbles, and organized tab views (Chat, Preferences, Bookings).
- **Persistent Bookings**: Stores confirmed trips into a local SQLite database that instantly updates on the frontend.
- **FastAPI Backend**: High-performance asynchronous Python backend to route messages to Groq and handle database transactions.

## Tech Stack
- **Frontend**: Vanilla HTML5, CSS3, JavaScript
- **Backend**: Python, FastAPI
- **Database**: SQLite
- **AI Model Integration**: Groq API (Llama-3-70b-versatile)

## Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Muskan6122005/Voyagr-Ai-Travel-agent.git
   cd Voyagr-Ai-Travel-agent
   ```

2. **Set up the Python Backend:**
   Install the required dependencies inside your virtual environment.
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables:**
   Create a `.env` file inside the `backend` directory and add your Groq API key:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

4. **Start the Server:**
   Run the FastAPI application.
   ```bash
   chmod +x run.sh
   ./run.sh
   ```
   *Alternatively, run `uvicorn main:app --reload` from the `backend` folder.*

5. **Open the App:**
   The backend natively mounts the `frontend` folder, meaning you can simply navigate to `http://localhost:8000` in your browser to start using Voyagr!

## Deployment Notes
This project is configured to separate the frontend and backend for deployment.
- **Frontend**: Configured for Netlify (using `netlify.toml`).
- **Backend**: Can be hosted on platforms like Render or Railway. Once the backend is deployed, you must update the `BACKEND_URL` variable in `frontend/app.js` prior to deploying the frontend to Netlify.
