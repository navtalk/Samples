#!/usr/bin/env python3
"""
Simple script to run the webhook server
"""
import os
import sys
from dotenv import load_dotenv
import uvicorn

# Load environment variables
load_dotenv()

# Get port from environment or use default
port = int(os.getenv("SERVER_PORT", "8080"))

if __name__ == "__main__":
    print(f"Starting Webhook Server on port {port}...")
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        reload=False
    )

