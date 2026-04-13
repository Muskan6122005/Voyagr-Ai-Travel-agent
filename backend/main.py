import os
import json
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from groq import Groq
from dotenv import load_dotenv

from database import init_db, save_trip, get_trips

load_dotenv()
API_KEY = os.getenv("GROQ_API_KEY")

# Initialize the Groq client
client = Groq(api_key=API_KEY)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS for frontend hosting
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (update to Netlify URL in production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB on startup
@app.on_event("startup")
def startup():
    init_db()

# Define the Tool function for the Python backend
def book_trip(destination: str, dates: str, people: str, hotel: str = "", flight: str = "", preferences: str = ""):
    """
    Books a confirmed travel trip for the user and saves it to the database.
    """
    details = {"hotel": hotel, "flight": flight, "preferences": preferences}
    try:
        pax = int(str(people).strip())
    except:
        pax = 1
    save_trip(destination, dates, pax, details)
    return f"Success! The trip to {destination} ({dates}) for {people} has been officially booked."

SYSTEM_PROMPT = """You are Voyagr, a warm and expert AI travel agent. You help users plan trips, find flights and hotels, build itineraries, and manage their travel bookings.

Your workflow:
1. DISCOVERY: Ask for destination and duration.
2. OPTIONS: Provide 2-3 realistic flight/hotel options. Frame your options clearly so the user knows what to select. You MUST explicitly provide hypothetical Departure and Arrival timings for flights or trains!
3. REFINEMENT: Ask for precise dates (e.g., "Oct 12 - Oct 17"), number of people, and their preferred seat/travel class (e.g. AC 2-Tier, Window Seat, Business Class).
4. BOOKING: ONLY WHEN the user explicitly CONFIRMS the trip, dates, and people, you MUST call the `book_trip` function.
CRITICAL DATE CHECK: Before calling `book_trip`, verify that the selected calendar dates match their initially requested duration. If there is a mismatch (e.g. they asked for a 3-day trip but selected 4 days of dates), DO NOT call the tool. Instead, ask them to clarify (e.g. "Wait, you mentioned a 3-day trip but chose dates for 4 days. Are you sure?").

Always be conversational, use emojis, and format clearly. 

If the user wants to book, summarize their choices and call the tool immediately. Do not ask for any further authorization if they already provided the destination, dates, and pax."""

# OpenAI compatibility schema for Groq tools
tools = [
    {
        "type": "function",
        "function": {
            "name": "book_trip",
            "description": "Books a confirmed travel trip for the user and saves it to the database. ONLY call this after explicit confirmation of destination, dates, and people.",
            "parameters": {
                "type": "object",
                "properties": {
                    "destination": {"type": "string"},
                    "dates": {"type": "string", "description": "e.g., Oct 12 - Oct 17"},
                    "people": {"type": "string", "description": "number of people"},
                    "hotel": {"type": "string"},
                    "flight": {"type": "string"},
                    "preferences": {"type": "string"}
                },
                "required": ["destination", "dates", "people"]
            }
        }
    }
]

@app.post("/api/chat")
async def chat_endpoint(request: Request):
    data = await request.json()
    frontend_messages = data.get("messages", [])
    
    if not frontend_messages:
        return JSONResponse({"error": "No messages provided"}, status_code=400)
    
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    # Map frontend roles to OpenAI/Groq standard roles
    for msg in frontend_messages:
        role = "assistant" if msg["role"] == "model" else msg["role"]
        messages.append({
            "role": role,
            "content": msg["content"]
        })

    try:
        # First API call to determine if Groq wants to chat or use the tool
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            tools=tools,
            tool_choice="auto",
            max_tokens=1000
        )
        
        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls

        # If Groq decides to use a tool!
        if tool_calls:
            # We must append the assistant's tool request to history per API spec
            messages.append(response_message)
            
            # Execute all requested functions in Python
            for tool_call in tool_calls:
                function_name = tool_call.function.name
                if function_name == "book_trip":
                    args = json.loads(tool_call.function.arguments)
                    function_response_text = book_trip(
                        destination=args.get("destination", "Unknown"),
                        dates=args.get("dates", "Unknown"),
                        people=args.get("people", 1),
                        hotel=args.get("hotel", ""),
                        flight=args.get("flight", ""),
                        preferences=args.get("preferences", "")
                    )
                    
                    # Feed the python execution result back to Groq
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": function_name,
                        "content": function_response_text,
                    })

            # Run a second API call so Groq can respond with the final success message!
            second_response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages
            )
            return {"content": second_response.choices[0].message.content}
            
        else:
            # Normal conversational response without tools
            return {"content": response_message.content}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/trips")
def get_trips_endpoint():
    return {"trips": get_trips()}

# Serve static frontend
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
