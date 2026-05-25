#!/usr/bin/env python3
"""
Verdiqt Setup Script
Installs all dependencies and tests the system
"""

import subprocess
import sys
import os
import requests
import json

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n🔧 {description}")
    print(f"Running: {command}")
    
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Success: {description}")
            if result.stdout.strip():
                print(f"Output: {result.stdout.strip()}")
        else:
            print(f"❌ Failed: {description}")
            print(f"Error: {result.stderr.strip()}")
            return False
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False
    
    return True

def check_python_version():
    """Check if Python version is compatible"""
    print("🐍 Checking Python version...")
    version = sys.version_info
    print(f"Python version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 7):
        print("❌ Python 3.7+ required")
        return False
    
    print("✅ Python version is compatible")
    return True

def install_dependencies():
    """Install all required Python dependencies"""
    print("\n📦 Installing Python dependencies...")
    
    dependencies = [
        "fastapi",
        "uvicorn",
        "transformers",
        "torch",
        "langdetect",
        "pydantic",
        "requests"
    ]
    
    for dep in dependencies:
        success = run_command(f"pip install {dep}", f"Installing {dep}")
        if not success:
            print(f"⚠️  Failed to install {dep}, trying with --user flag...")
            run_command(f"pip install --user {dep}", f"Installing {dep} (user)")

def test_imports():
    """Test if all required modules can be imported"""
    print("\n🧪 Testing imports...")
    
    modules = [
        ("fastapi", "FastAPI"),
        ("uvicorn", "Uvicorn"),
        ("transformers", "Transformers"),
        ("torch", "PyTorch"),
        ("langdetect", "Language Detection"),
        ("pydantic", "Pydantic"),
        ("requests", "Requests")
    ]
    
    all_good = True
    
    for module, name in modules:
        try:
            __import__(module)
            print(f"✅ {name} imported successfully")
        except ImportError as e:
            print(f"❌ {name} import failed: {e}")
            all_good = False
    
    return all_good

def test_backend():
    """Test if backend can start and respond"""
    print("\n🚀 Testing backend startup...")
    
    # Start backend in background
    print("Starting backend server...")
    backend_process = subprocess.Popen([
        sys.executable, "-c", 
        """
import uvicorn
import sys
import os
sys.path.append('.')
from main import app
uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")
        """
    ], cwd="verdiqt/backend")
    
    # Wait a bit for startup
    import time
    time.sleep(5)
    
    # Test health endpoint
    try:
        response = requests.get("http://localhost:8000/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend health check: {data}")
            
            if data.get('models_loaded'):
                print("✅ ML model loaded successfully")
            else:
                print("⚠️  ML model not loaded")
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Backend test failed: {e}")
    finally:
        # Stop backend
        backend_process.terminate()
        backend_process.wait()
    
    return True

def main():
    """Main setup function"""
    print("🎯 Verdiqt Setup Script")
    print("=" * 50)
    
    # Check current directory
    if not os.path.exists("verdiqt"):
        print("❌ Please run this script from the directory containing 'verdiqt' folder")
        return
    
    # Step 1: Check Python version
    if not check_python_version():
        return
    
    # Step 2: Install dependencies
    install_dependencies()
    
    # Step 3: Test imports
    if not test_imports():
        print("\n❌ Some imports failed. Please check the error messages above.")
        return
    
    # Step 4: Test backend
    print("\n🧪 Testing backend...")
    os.chdir("verdiqt/backend")
    
    # Run the multilingual test
    if os.path.exists("test_multilingual.py"):
        print("Running multilingual test...")
        run_command("python test_multilingual.py", "Multilingual test")
    
    print("\n" + "=" * 50)
    print("🎉 Setup completed!")
    print("\n📋 Next steps:")
    print("1. Start backend: cd verdiqt/backend && uvicorn main:app --reload")
    print("2. Load extension in Chrome: chrome://extensions/")
    print("3. Test on any website with text content")
    print("\n🔍 If issues persist, check the console logs and error messages above.")

if __name__ == "__main__":
    main()