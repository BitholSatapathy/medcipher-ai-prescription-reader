#!/usr/bin/env python3
"""
Startup script for MedCipher Medicine API
This script starts the Flask API server with proper initialization
"""

import sys
import os

# Add the current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

try:
    print("🚀 Starting MedCipher Medicine API...")
    print("📊 This will load 521K+ medicine entries - please be patient!")
    print("⏳ Initialization may take 1-2 minutes...")
    
    from python.medical_autocorrect_api import app
    
    print("\n✅ SymSpell dictionary initialized successfully!")
    print("🌐 Starting Flask server on http://127.0.0.1:5000")
    print("💡 Press Ctrl+C to stop the server")
    print("=" * 60)
    
    app.run(host='127.0.0.1', port=5000, debug=False)
    
except KeyboardInterrupt:
    print("\n\n👋 Server stopped by user")
except Exception as e:
    print(f"\n❌ Error starting server: {e}")
    sys.exit(1)