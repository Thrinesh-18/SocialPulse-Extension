# 🚀 Verdiqt Quick Start Guide

## Option 1: Automatic Setup (Recommended)

### Windows:
```cmd
# Double-click this file or run in Command Prompt
setup.bat
```

### Mac/Linux:
```bash
# Make executable and run
chmod +x setup.sh
./setup.sh
```

### Python Script (All platforms):
```bash
python setup.py
```

---

## Option 2: Manual Setup

### 1. Install Dependencies:
```bash
cd verdiqt/backend
pip install fastapi uvicorn transformers torch langdetect pydantic requests
```

### 2. Test Backend:
```bash
python test_multilingual.py
```

### 3. Start Backend:
```bash
uvicorn main:app --reload
```

### 4. Load Chrome Extension:
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `verdiqt/extension` folder

---

## 🧪 Testing Steps:

### 1. Test Backend:
- Open http://localhost:8000/health
- Should show: `{"status": "ok", "models_loaded": true}`

### 2. Test Extension:
1. Visit any website (Reddit, Yelp, Medium, etc.)
2. Look for purple "V" button (bottom-right)
3. Click the "V" button
4. Sidebar should appear and analyze text

### 3. Expected Results:
- **Sidebar**: Shows sentiment percentages and detected languages
- **Page badges**: Colored badges appear next to text content
- **Console logs**: Shows analysis process (F12 → Console)

---

## 🚨 Troubleshooting:

### Backend Won't Start:
```bash
# Try upgrading pip first
python -m pip install --upgrade pip

# Install with user flag if permission issues
pip install --user fastapi uvicorn transformers torch langdetect
```

### Extension Not Working:
1. **Reload extension**: chrome://extensions/ → reload Verdiqt
2. **Refresh page**: Press F5 on the website
3. **Check console**: F12 → Console tab for errors

### Model Loading Issues:
- **Internet required**: First run downloads ~500MB model
- **Disk space**: Ensure 1GB+ free space
- **Patience**: Model download can take 5-10 minutes

---

## 📊 What Should Work:

### ✅ Websites Supported:
- **E-commerce**: Amazon, eBay, Flipkart
- **Social**: Reddit, Twitter, Facebook
- **Reviews**: Yelp, TripAdvisor, Google Reviews
- **Blogs**: Medium, WordPress sites
- **Forums**: Stack Overflow, Quora
- **Any site with text content**

### ✅ Languages Supported:
- English, Hindi, Tamil, Telugu, Kannada
- Malayalam, Bengali, Marathi, Gujarati
- Punjabi, Odia

### ✅ Features:
- Real-time sentiment analysis
- Language detection
- Visual sentiment badges
- Summary statistics
- Works on any website

---

## 🎯 Success Indicators:

1. **Backend health check passes** ✅
2. **Purple V button appears** on websites ✅
3. **Sidebar shows mixed sentiments** (not all neutral) ✅
4. **Language badges show detected languages** ✅
5. **Works on multiple website types** ✅

---

## 📞 Need Help?

If setup fails:
1. **Check Python version**: `python --version` (need 3.7+)
2. **Check pip**: `pip --version`
3. **Try virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   venv\Scripts\activate     # Windows
   pip install -r requirements.txt
   ```

The extension should now work universally on any website! 🌍✨