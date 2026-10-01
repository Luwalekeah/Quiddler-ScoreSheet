"""The score sheet with saving turned on, using an in-memory stand-in for the store."""
import copy
import uuid
from types import SimpleNamespace

import pytest

import persistence
from conftest import new_app, score_input, setting_input, totals
from persistence import StoreError

GAME_ID = "0b8f3c1e-6f5d-4d43-9d1c-2f0f5a4b7e11"


class FakeStore:
    def __init__(self):
        self.games = {}
        self.saves = []
        self.loads = []
        self.fail_load = False
        self.fail_save = False

    def load(self, app, game_id):
        self.loads.append((app, game_id))
        if self.fail_load:
            raise StoreError("load_game failed (ConnectionError, HTTP status None)")
        return copy.deepcopy(self.games.get((app, game_id)))

    def save(self, app, game_id, state):
        if self.fail_save:
            raise StoreError("save_game failed (Timeout, HTTP status None)")
        self.games[(app, game_id)] = copy.deepcopy(state)
        self.saves.append((app, game_id))


@pytest.fixture
def store(monkeypatch):
    fake = FakeStore()
    monkeypatch.setattr(persistence, "get_store", lambda: fake)
    return fake


def saved_state(**overrides):
    state = {
        "v": 1,
        "players": ["Ann", "Bo", "Cy"],
        "rounds": 3,
        "scores": [[10, 7, None], [None, 12, 3], [5, None, None]],
    }
    state.update(overrides)
    return state


def captions(at):
    return [c.value for c in at.caption]


def warnings(at):
    return [w.value for w in at.warning]


# --- when saving is not configured --------------------------------------------------------


def test_without_a_store_nothing_is_saved_and_the_ui_is_unchanged(monkeypatch):
    monkeypatch.setattr(persistence, "get_store", lambda: None)
    at = new_app()
    score_input(at, "Player 1", 1).set_value(10)
    at.run()
    assert totals(at)["Player 1"] == 10
    assert "game" not in at.query_params
    assert [b for b in at.button if b.key == "new_game"] == []
    assert captions(at) == [] and warnings(at) == []


# --- creating and updating a game ---------------------------------------------------------


def test_a_page_view_alone_saves_nothing(store):
    at = new_app()
    at.run()
    assert store.saves == [] and store.loads == []
    assert "game" not in at.query_params
    assert any("once you enter something" in c for c in captions(at))


def test_first_change_creates_a_game_and_puts_its_id_in_the_url(store):
    at = new_app()
    score_input(at, "Player 1", 1).set_value(10)
    score_input(at, "Player 2", 1).set_value(7)
    at.run()
    ((app_name, game_id),) = set(store.games)
    assert app_name == "quiddler"
    assert str(uuid.UUID(game_id)) == game_id
    assert at.query_params["game"] == [game_id]
    assert store.games[("quiddler", game_id)] == {
        "v": 1,
        "players": ["Player 1", "Player 2"],
        "rounds": 5,
        "scores": [[10, 7], [None, None], [None, None], [None, None], [None, None]],
    }
    assert any("Saved automatically" in c for c in captions(at))


def test_later_changes_update_the_same_game(store):
    at = new_app()
    score_input(at, "Player 1", 1).set_value(10)
    at.run()
    score_input(at, "Player 2", 2).set_value(4)
    at.run()
    assert len({game_id for _, game_id in store.saves}) == 1
    (state,) = store.games.values()
    assert state["scores"][0] == [10, None] and state["scores"][1] == [None, 4]


def test_a_rerun_with_nothing_changed_does_not_save_again(store):
    at = new_app()
    score_input(at, "Player 1", 1).set_value(10)
    at.run()
    saves = len(store.saves)
    at.run()
    at.run()
    assert len(store.saves) == saves


def test_changing_players_rounds_and_names_is_saved(store):
    at = new_app()
    setting_input(at, "num_players_input").set_value(3)
    at.run()
    setting_input(at, "num_games_input").set_value(2)
    at.run()
    (state,) = store.games.values()
    assert state["players"] == ["Player 1", "Player 2", "Player 3"] and state["rounds"] == 2


# --- reopening a game (the refresh case) --------------------------------------------------


def test_reopening_the_link_restores_names_rounds_and_scores(store):
    store.games[("quiddler", GAME_ID)] = saved_state()
    at = new_app(game=GAME_ID)
    assert totals(at) == {"Ann": 15, "Bo": 19, "Cy": 3}
    assert score_input(at, "Bo", 2).value == 12
    assert setting_input(at, "num_games_input").value == 3
    assert not at.exception and warnings(at) == []
    assert store.saves == []  # opening a game does not rewrite it


def test_reopening_a_game_with_duplicate_player_names_does_not_crash(store):
    """Score widget keys are index-based, so duplicate names round-trip safely."""
    store.games[("quiddler", GAME_ID)] = saved_state(players=["Ann", "Ann", "Cy"])
    at = new_app(game=GAME_ID)
    assert not at.exception


def test_a_refresh_round_trip_returns_to_the_same_game(store):
    first = new_app()
    score_input(first, "Player 1", 1).set_value(21)
    score_input(first, "Player 2", 3).set_value(8)
    first.run()
    game_id = next(iter(store.games))[1]
    reopened = new_app(game=game_id)  # a new browser session, same URL
    assert totals(reopened) == {"Player 1": 21, "Player 2": 8}


def test_restored_game_can_be_edited_and_saves_back_to_the_same_id(store):
    store.games[("quiddler", GAME_ID)] = saved_state()
    at = new_app(game=GAME_ID)
    score_input(at, "Ann", 3).set_value(9)
    at.run()
    assert store.saves == [("quiddler", GAME_ID)]
    assert store.games[("quiddler", GAME_ID)]["scores"][2][0] == 9
    assert totals(at)["Ann"] == 19


def test_an_unknown_game_id_starts_blank_and_writes_nothing_until_a_change(store):
    at = new_app(game=GAME_ID)
    assert totals(at) == {"Player 1": 0, "Player 2": 0}
    assert store.saves == [] and not at.exception
    score_input(at, "Player 1", 1).set_value(3)
    at.run()
    assert store.saves == [("quiddler", GAME_ID)]


@pytest.mark.parametrize("bad", ["not-a-uuid", "../../etc/passwd", "0b8f3c1e", ""])
def test_a_malformed_game_param_is_ignored(store, bad):
    at = new_app(game=bad)
    assert store.loads == [] and not at.exception
    assert totals(at) == {"Player 1": 0, "Player 2": 0}


# --- failures: never lose data, never crash -----------------------------------------------


def test_if_the_saved_game_cannot_be_loaded_saving_is_paused_so_it_is_not_overwritten(store):
    store.games[("quiddler", GAME_ID)] = saved_state()
    before = copy.deepcopy(store.games)
    store.fail_load = True
    at = new_app(game=GAME_ID)
    assert any("saving is paused" in w for w in warnings(at))
    score_input(at, "Player 1", 1).set_value(99)
    at.run()
    store.fail_load = False  # even once the service is back, this session must not write
    score_input(at, "Player 1", 2).set_value(98)
    at.run()
    assert store.saves == [] and store.games == before
    assert totals(at)["Player 1"] == 99 + 98  # the sheet itself keeps working


@pytest.mark.parametrize(
    "bad_state",
    [
        saved_state(v=2),
        saved_state(players=["Ann"]),
        saved_state(players=["A"] * 9),
        saved_state(players=["x" * 41, "Bo", "Cy"]),
        saved_state(players=["Ann", 2, "Cy"]),
        saved_state(rounds=11, scores=[[None, None, None]] * 11),
        saved_state(rounds=0, scores=[]),
        saved_state(rounds=2),  # matrix has 3 rows
        saved_state(scores=[[10, 7], [1, 2], [3, 4]]),  # rows have 2 columns, 3 players
        saved_state(scores=[[1000, None, None], [None] * 3, [None] * 3]),
        saved_state(scores=[[-1, None, None], [None] * 3, [None] * 3]),
        saved_state(scores=[["9", None, None], [None] * 3, [None] * 3]),
        saved_state(scores=[[True, None, None], [None] * 3, [None] * 3]),
        {"v": 1},
        {},
    ],
)
def test_an_invalid_saved_state_is_ignored_and_never_overwritten(store, bad_state):
    store.games[("quiddler", GAME_ID)] = bad_state
    before = copy.deepcopy(store.games)
    at = new_app(game=GAME_ID)
    assert not at.exception
    assert totals(at) == {"Player 1": 0, "Player 2": 0}
    assert any("saving is paused" in w for w in warnings(at))
    score_input(at, "Player 1", 1).set_value(5)
    at.run()
    assert store.games == before


def test_a_failed_save_warns_but_the_sheet_keeps_working_and_it_retries(store, monkeypatch):
    now = [1000.0]
    monkeypatch.setattr(persistence, "time", SimpleNamespace(monotonic=lambda: now[0]))
    store.fail_save = True
    at = new_app()
    score_input(at, "Player 1", 1).set_value(10)
    at.run()
    assert any("Couldn't save" in w for w in warnings(at))
    assert totals(at)["Player 1"] == 10 and not at.exception
    assert "game" not in at.query_params  # no link to a game that was never stored

    store.fail_save = False
    score_input(at, "Player 1", 2).set_value(5)
    at.run()  # still inside the retry back-off: no attempt is made
    assert store.saves == []

    now[0] += persistence.RETRY_AFTER_SECONDS + 1
    score_input(at, "Player 1", 3).set_value(1)
    at.run()
    assert len(store.saves) == 1 and warnings(at) == []
    (state,) = store.games.values()
    assert [row[0] for row in state["scores"][:3]] == [10, 5, 1]  # the retry saved everything, not just the last edit


# --- New game -----------------------------------------------------------------------------


def test_new_game_blanks_the_sheet_detaches_from_the_saved_game_and_keeps_it(store):
    at = new_app()
    score_input(at, "Player 1", 1).set_value(10)
    at.run()
    old_id = next(iter(store.games))[1]

    next(b for b in at.button if b.key == "new_game").click().run()
    assert totals(at) == {"Player 1": 0, "Player 2": 0}
    assert "game" not in at.query_params
    assert ("quiddler", old_id) in store.games  # the finished game is still there

    score_input(at, "Player 1", 1).set_value(4)
    at.run()
    assert {g for _, g in store.games} != {old_id}
    assert len(store.games) == 2
