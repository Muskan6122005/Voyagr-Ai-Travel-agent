#!/bin/bash
cd "$(dirname "$0")"
source .venv/bin/activate
uvicorn main:app --port 8000 --reload
