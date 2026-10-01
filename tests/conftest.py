import logging
from pathlib import Path

import pytest
from streamlit.testing.v1 import AppTest

APP_PATH = str(Path(__file__).resolve().parent.parent / "quiddler.py")


@pytest.fixture
def streamlit_warnings(monkeypatch):
    """Collect WARNING+ log lines emitted by Streamlit (deprecations, empty-label notices, ...).

    Streamlit gives some of its loggers propagate=False and their own handler, so a handler
    attached to the "streamlit" logger misses them. Wrapping Logger.handle sees every record.
    """
    messages = []
    original = logging.Logger.handle

    def handle(self, record):
        if record.name.startswith("streamlit") and record.levelno >= logging.WARNING:
            message = record.getMessage()
            if "missing ScriptRunContext" not in message:  # emitted by AppTest itself, not the app
                messages.append(message)
        return original(self, record)

    monkeypatch.setattr(logging.Logger, "handle", handle)
    return messages


@pytest.fixture
def app():
    at = AppTest.from_file(APP_PATH, default_timeout=30)
    at.run()
    assert not at.exception, [e.value for e in at.exception]
    return at


def new_app(game=None):
    """Start the app, optionally as if the browser had opened /?game=<game>."""
    at = AppTest.from_file(APP_PATH, default_timeout=30)
    if game is not None:
        at.query_params["game"] = game
    at.run()
    return at


def _player_index(at, player):
    """Resolve a player's current column index from the live player_name_* widgets.

    Score widget keys are index-based (see scoresheet.py), so tests look names up
    by their current position rather than embedding the name in the widget key.
    """
    names = sorted(
        (int(t.key.removeprefix("player_name_")), t.value) for t in at.text_input
        if t.key.startswith("player_name_")
    )
    return [name for _, name in names].index(player)


def score_input(at, player, round_number):
    index = _player_index(at, player)
    return next(n for n in at.number_input if n.key == f"score_{index}_{round_number}")


def setting_input(at, key):
    return next(n for n in at.number_input if n.key == key)


def name_input(at, index):
    return next(t for t in at.text_input if t.key == f"player_name_{index}")


def totals(at):
    return {m.label: int(m.value) for m in at.metric}
