@echo off
echo ============================================
echo   HeroWeb - Starting server
echo ============================================
echo.

if not exist "venv" (
    echo [ERROR] Virtual environment not found.
    echo Run install.bat first.
    pause
    exit /b 1
)

if not exist ".env" (
    echo [ERROR] .env file not found.
    echo Create a .env file with your API key:
    echo   OPENROUTER_API_KEY=your-key-here
    echo Get a key at https://openrouter.ai/
    pause
    exit /b 1
)

call venv\Scripts\activate.bat

echo Opening browser in 2 seconds...
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5000"

echo Server running at http://localhost:5000
echo Press Ctrl+C to stop.
echo.
cd googleengine
python server.py
