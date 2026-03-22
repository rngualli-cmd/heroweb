# HeroWeb - AI Social Media Image Generator

Generate superhero-themed social media post images using AI (Google Gemini via OpenRouter). Includes image generation, inpainting (region editing), caption generation, and card overlay mode.

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/rngualli-cmd/heroweb.git
cd heroweb
```

### 2. Create a virtual environment

```bash
python -m venv venv
```

Activate it:

- **Windows:** `venv\Scripts\activate`
- **Mac/Linux:** `source venv/bin/activate`

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set up your API key

Create a `.env` file in the project root:

```
OPENROUTER_API_KEY=your-openrouter-api-key-here
```

Get a key at [openrouter.ai](https://openrouter.ai/).

### 5. Run the server

```bash
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
