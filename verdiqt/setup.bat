@echo off
echo 🎯 Verdiqt Windows Setup Script
echo ================================

echo.
echo 📦 Installing Python dependencies...
cd verdiqt\backend

echo Installing FastAPI...
pip install fastapi

echo Installing Uvicorn...
pip install uvicorn

echo Installing Transformers...
pip install transformers

echo Installing PyTorch...
pip install torch

echo Installing Language Detection...
pip install langdetect

echo Installing Pydantic...
pip install pydantic

echo Installing Requests...
pip install requests

echo.
echo ✅ Dependencies installed!

echo.
echo 🧪 Testing backend...
python test_multilingual.py

echo.
echo 🎉 Setup completed!
echo.
echo 📋 Next steps:
echo 1. Start backend: uvicorn main:app --reload
echo 2. Load extension in Chrome: chrome://extensions/
echo 3. Test on any website with text content

pause