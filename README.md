# BigQuery Release Notes Explorer

A minimalist, dark-themed web application built with **Python Flask** and **Vanilla HTML/CSS/JavaScript** that fetches, parses, and displays [Google Cloud BigQuery release notes](https://cloud.google.com/bigquery/docs/release-notes) — with real-time search, category filtering, and one-click Twitter/X sharing.

---

## ✨ Features

- 📡 **Live Feed** — Fetches the official BigQuery Atom XML feed directly from Google Cloud
- 🔍 **Instant Search** — Filter release notes by keyword in real time
- 🏷️ **Category Filters** — Filter by `Feature`, `Issue`, `Changed`, `Deprecated`
- 🔄 **Refresh Button** — Force-fetches the latest updates, bypassing the server-side cache
- 🐦 **Tweet Any Update** — Opens a pre-filled Twitter/X composer with a character counter and SVG progress ring
- 💾 **Smart Caching** — Feed results are cached in-memory for 10 minutes to reduce redundant requests
- 🌙 **Minimalist Dark UI** — Clean, flat design with monochrome typography and subtle borders

---

## 🗂️ Project Structure

```
bq-release-notes-explorer/
├── app.py                  # Flask backend — XML fetching, parsing, and API routes
├── requirements.txt        # Python dependencies
├── .gitignore
├── templates/
│   └── index.html          # Main HTML template
└── static/
    ├── css/
    │   └── styles.css      # Minimalist stylesheet
    └── js/
        └── main.js         # Client-side logic — rendering, filtering, modal, tweet composer
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- pip

### Installation

```bash
# Clone the repository
git clone https://github.com/Gittersi/bq-release-notes-explorer.git
cd bq-release-notes-explorer

# (Optional) Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate      # Windows
source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### Run the App

```bash
python app.py
```

Then open your browser at **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serves the main web UI |
| `GET` | `/api/release-notes` | Returns cached parsed release notes as JSON |
| `GET` | `/api/release-notes?refresh=true` | Forces a fresh fetch from Google Cloud, bypassing cache |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python, Flask |
| Feed Parsing | `xml.etree.ElementTree`, `BeautifulSoup4` |
| HTTP Client | `requests` |
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| Fonts | Inter, Outfit, Fira Code (Google Fonts) |
| Icons | Font Awesome 6 |

---

## 📄 License

MIT License. Feel free to use, modify, and distribute.
