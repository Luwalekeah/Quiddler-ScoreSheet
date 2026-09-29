# Quiddler ScoreSheet

A Streamlit-based interactive score sheet and calculator for the Quiddler word game, complete with gameplay instructions and reference materials.

## Table of Contents

- [Quiddler ScoreSheet](#quiddler-scoresheet)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [Installation](#installation)
  - [Usage](#usage)
  - [File Structure](#file-structure)
  - [Configuration](#configuration)
  - [Saving Games (Optional)](#saving-games-optional)
  - [Run in a Container (k3s)](#run-in-a-container-k3s)
  - [Dependencies](#dependencies)
  - [Contributing](#contributing)
  - [License \& Credits](#license--credits)

---

## Overview

Quiddler ScoreSheet is a lightweight web application built with Streamlit to help Quiddler players track scores, calculate letter values, and access game instructions and reference materials. The application includes:

* An in-app calculator for quick arithmetic during gameplay.
* A dynamic, editable score sheet that automatically tallies player totals.
* Expandable sections containing game overview, rules, scoring guidelines, and strategy tips.
* A navigation banner and footer with developer credits.

## Features

* **Interactive Calculator**: Evaluate arithmetic (`+ - * / // % **` and parentheses, e.g. calculating word scores) directly within the app. Only numbers and these operators are accepted.
* **Dynamic Score Sheet**:

  * Configure the number of players (1–8) and number of rounds (1–10).
  * Enter player names and input scores per round in a spreadsheet-like interface.
  * View real-time totals for each player.
* **Expanders Section**:

  * Game Overview: Player counts, age ranges, and deck composition.
  * How to Play: Turn mechanics, going out rules, and word requirements.
  * Scoring System: Basic scoring, bonus points breakdown, and special rules.
  * Challenges & Strategy: Word challenge rules and strategic tips.
  * Card Reference: Letter values, deck quantities, and special double-letter cards.
  * Quick Letter Lookup: Simplified letter-value lookup table.
* **Responsive UI**: Designed for a centered layout, auto-adjusts to various screen sizes.

## Installation

1. **Clone the repository**:

   ```sh
   git clone https://github.com/Luwalekeah/Quiddler-ScoreSheet.git
   cd Quiddler-ScoreSheet
   ```
2. **Create a virtual environment** (recommended):

   ```sh
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. **Install dependencies**:

   ```sh
   pip install -r requirements.txt
   ```

   If no `requirements.txt` exists, install Streamlit and pandas directly:

   ```sh
   pip install streamlit pandas
   ```

## Usage

Run the Streamlit application:

```sh
streamlit run quiddler.py
```

* Open the provided `localhost` URL in your browser (e.g., `http://localhost:8501`).
* Use the calculator panel to compute expressions.
* Expand the “Settings & Player Names” section to configure players and rounds.
* Enter scores in the dynamic table and view totals in the “Totals” row.
* Scroll down to access game instructions and reference expanders.

## File Structure

```
Quiddler-ScoreSheet/
├── calculator.py       # QuiddlerCalculator class: safe arithmetic input/output
├── expander.py         # QuiddlerExpanders class: game instructions, rules, reference
├── scoresheet.py       # QuiddlerScoresheet class: dynamic score table + totals
├── persistence.py      # Optional autosave of games to Supabase
├── quiddler.py         # Main Streamlit entry point, stitches features together
├── supabase/schema.sql # Proposed database schema for saved games
├── Dockerfile          # Container image (see "Run in a Container")
├── tests/              # AppTest-based tests (run with `pytest`)
├── README.md           # This documentation file
├── requirements.txt    # Pinned runtime dependencies
├── requirements-dev.txt# Runtime dependencies + pytest
└── .gitignore          # Ignore environment files, __pycache__, etc.
```

## Configuration

* **Page Configuration**: The app uses `st.set_page_config` to set a centered layout and custom page title.
* **Session State**: Player counts, round counts, and scores persist in Streamlit’s `session_state` between reruns. They are lost when the browser tab is refreshed unless saving is enabled (next section).
* **Expander Visibility**: The top controls (settings & player names) are hidden inside an expandable panel for a cleaner interface.

## Saving Games (Optional)

By default a game lives only in the open browser tab, so a refresh starts a new game. To keep games across refreshes, back the app with [Supabase](https://supabase.com/):

1. In a Supabase project, run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor. It creates one table with row-level security switched on and two functions; the comments at the top explain the access model.
2. Give the app the project URL and its anon/publishable key, as environment variables or in `.streamlit/secrets.toml` (git-ignored) / your host's secrets:

   ```toml
   SUPABASE_URL = "https://<project>.supabase.co"
   SUPABASE_KEY = "<anon or publishable key>"
   ```

With both set:

* The first change you make creates a game and adds `?game=<id>` to the page URL. Bookmark or share that link; opening it (including after a refresh) restores the sheet.
* Every change is saved automatically. Nothing is written just for viewing the page.
* **🆕 New game** blanks the sheet and starts a fresh game; the old one stays stored.
* If the save service is down the sheet keeps working and shows a warning. A game that could not be loaded is never saved over.
* The link is the only credential, so anyone who has it can view and edit that game. Only player names and scores are stored. There are no accounts, so there is no list of past games.
* Rounds and players hidden by lowering the settings are not saved.

Leave the variables unset and the app behaves exactly as before.

## Run in a Container (k3s)

```sh
docker build -t quiddler-scoresheet .
docker run --rm -p 8501:8501 quiddler-scoresheet
```

Multi-architecture image (every dependency ships arm64 wheels, so no compilers are needed):

```sh
docker buildx build --platform linux/amd64,linux/arm64 -t <registry>/quiddler-scoresheet:<tag> --push .
```

Running it on Kubernetes / k3s:

* Container port `8501`. Point liveness and readiness probes at `GET /_stcore/health` (returns `ok`).
* Runs as UID/GID `10001`, so `runAsNonRoot: true` works. The image sets `HOME=/home/app`; the app started and served pages with an unwritable `HOME`, so a read-only root filesystem is expected to work (mount an `emptyDir` at `/tmp` if you see write errors).
* The ingress must pass WebSocket connections through (Traefik, k3s's default, does). To serve under a sub-path set `STREAMLIT_SERVER_BASE_URL_PATH`.
* Provide `SUPABASE_URL` and `SUPABASE_KEY` from a Secret if you enable saving. Do not bake them into the image.
* The image sets `STREAMLIT_CLIENT_TOOLBAR_MODE=viewer`, which hides the "Deploy" button and developer menu items.

This repository does not include Kubernetes manifests.

## Dependencies

Pinned in `requirements.txt` (Python **3.12 or newer** is required by NumPy 2.5):

* [Streamlit](https://streamlit.io/) 1.64.0
* [Pandas](https://pandas.pydata.org/) 3.0.6
* [NumPy](https://numpy.org/) 2.5.3 and [PyArrow](https://arrow.apache.org/docs/python/) 25.0.1 (pulled in by Streamlit and Pandas; the app code does not import them directly)

Install with:

```sh
pip install -r requirements.txt
```

## Tests

The tests drive the real app headlessly with Streamlit's `AppTest`:

```sh
pip install -r requirements-dev.txt
pytest
```

## Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-name`).
3. Make your changes and commit (`git commit -m 'Add feature'`).
4. Push to the branch (`git push origin feature-name`).
5. Open a pull request.

Please ensure pull requests follow the existing code style and include relevant tests or documentation updates.

## License & Credits

**Copyright © 2025 TechTales w/ Luwah.**

Original repository: [https://github.com/Luwalekeah](https://github.com/Luwalekeah)

Licensed under the MIT License. See `LICENSE` for details.
