#!/usr/bin/env python3
"""
Quick startup script for testing with small database
"""

import os
import sys

# Set test mode for faster startup
os.environ['TEST_MODE'] = '1'

# Add the current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

try:
    print("🧪 Starting MedCipher API in TEST MODE (5K medicines)")
    print("⚡ Fast startup for development and testing!")
    
    from python.medical_autocorrect_api import app
    
    print("\n✅ Test database loaded successfully!")
    print("🌐 Starting Flask server on http://127.0.0.1:5000")
    print("💡 Press Ctrl+C to stop the server")
    print("=" * 60)
    
    app.run(host='127.0.0.1', port=5000, debug=True)
    
except KeyboardInterrupt:
    print("\n\n👋 Server stopped by user")
except Exception as e:
    print(f"\n❌ Error starting server: {e}")
    sys.exit(1)