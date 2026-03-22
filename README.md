# HeroWeb - AI Social Media Image Generator

Generate superhero-themed social media post images using AI (Google Gemini via OpenRouter). Includes image generation, inpainting (region editing), caption generation, and card overlay mode.

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/rngualli-cmd/heroweb.git
cd heroweb
```

### 2. Set up your API key

Create a `.env` file in the project root:

```
OPENROUTER_API_KEY=your-openrouter-api-key-here
```

Get a key at [openrouter.ai](https://openrouter.ai/).

### 3. Install & Run

**Windows** — double-click or run from terminal:

```
install.bat        # Creates venv + installs dependencies
start.bat          # Starts server + opens browser
```

**Mac / Linux:**

```bash
chmod +x install.sh start.sh
./install.sh       # Creates venv + installs dependencies
./start.sh         # Starts server + opens browser
```

### Manual setup (alternative)

```bash
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
cd googleengine
python server.py
```

Open **http://localhost:5000** in your browser.

## Project Structure

```
heroweb/
├── GUI/                  # Frontend (HTML/CSS/JS)
│   ├── index2.html       # Main UI
│   ├── logic4.js         # Frontend logic
│   ├── Style2.css        # Styles
│   └── *.png             # UI assets
├── googleengine/
│   └── server.py         # Flask backend
├── requirements.txt
├── .env                  # Your API key (not in repo)
└── README.md
```
