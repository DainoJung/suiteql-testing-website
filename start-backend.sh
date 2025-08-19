#!/bin/bash

echo "🔌 Starting SuiteQL Backend..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found in root directory. Please create one with your NetSuite credentials."
    exit 1
fi

# Go to backend directory
cd backend

# Start the backend server
echo "🚀 Starting FastAPI server on http://localhost:8000"
python main.py