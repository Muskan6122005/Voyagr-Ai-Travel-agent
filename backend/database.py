import sqlite3
import json
import os

DB_PATH = "trips.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            destination TEXT NOT NULL,
            dates TEXT NOT NULL,
            people INTEGER NOT NULL,
            details TEXT,
            status TEXT DEFAULT 'Confirmed'
        )
    ''')
    conn.commit()
    conn.close()

def save_trip(destination: str, dates: str, people: int, details: dict):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO trips (destination, dates, people, details) VALUES (?, ?, ?, ?)",
        (destination, dates, people, json.dumps(details))
    )
    conn.commit()
    conn.close()

def get_trips():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, destination, dates, people, details, status FROM trips ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    
    trips = []
    for row in rows:
        trips.append({
            "id": row[0],
            "destination": row[1],
            "dates": row[2],
            "people": row[3],
            "details": json.loads(row[4]) if row[4] else {},
            "status": row[5]
        })
    return trips
