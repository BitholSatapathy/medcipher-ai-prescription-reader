# MedCipher - AI Prescription Reader

## ⚡ Quick Setup Guide

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start the Medicine API Server

**For Development/Testing (Fast - 5K medicines, ~10 seconds startup):**
```bash
python start_test_server.py
```

**For Production (Full database - 521K medicines, ~2-3 minutes startup):**
```bash
python start_api_server.py
```

### 3. Open the Web Application
Open `index.html` in your web browser or serve it through a local web server.

## 🐛 Troubleshooting Fixed Issues

✅ **All Major Issues Resolved:**
- ✅ **Backend Connection**: Flask server now starts properly with progress feedback
- ✅ **Database Path**: Fixed hardcoded paths - now uses relative paths
- ✅ **API Configuration**: Centralized URL configuration across all files
- ✅ **Timeout Issues**: Added 3-minute timeout protection to prevent hanging
- ✅ **Progress Feedback**: Better user feedback during analysis
- ✅ **Fast Development**: Test mode with 5K medicines for quick testing
- ✅ **Error Handling**: Graceful fallback when backend is unavailable

## 🔧 **Performance Improvements:**

1. **Fast Test Mode**: Use `start_test_server.py` for development
2. **Progress Feedback**: Visual progress during analysis
3. **Timeout Protection**: Analysis won't hang indefinitely
4. **Backend Health Check**: Automatically detects if API is available
5. **Graceful Degradation**: Works with Gemini only if backend fails

## Architecture

**Complete Pipeline:**
1. **Image Upload** → 2. **Gemini AI** (text extraction) → 3. **Medicine DB** (spell check) → 4. **HTML Output**

- **Frontend**: HTML/JavaScript with Gemini AI integration
- **Backend**: Flask API with SymSpell for medicine autocorrection  
- **Database**: 521K+ medicine names (or 5K for testing)

## If Analysis Gets Stuck:

1. **Check Backend**: Ensure Flask server is running (`start_test_server.py`)
2. **Wait for Timeout**: Analysis has 3-minute timeout protection
3. **Check Console**: Open browser dev tools to see detailed logs
4. **Restart Backend**: Stop and restart the Python server