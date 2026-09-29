"""Behavioural tests that drive the real app through Streamlit's AppTest."""
import pytest
from streamlit.testing.v1 import AppTest

from conftest import APP_PATH, name_input, score_input, setting_input, totals


def test_cold_start_renders_two_players_with_zero_totals(app):
    assert totals(app) == {"Player 1": 0, "Player 2": 0}
    assert [n.key for n in app.number_input if n.key.startswith("score_")].__len__() == 2 * 5


def test_no_streamlit_warnings_on_a_normal_run(streamlit_warnings):
    """Guards against forward-compat notices, e.g. empty widget labels that a future
    Streamlit release may turn into exceptions."""
    at = AppTest.from_file(APP_PATH, default_timeout=30)
    at.run()
    score_input(at, "Player 1", 1).set_value(10)
    at.run()
    assert streamlit_warnings == []


def test_totals_sum_each_players_rounds(app):
    score_input(app, "Player 1", 1).set_value(10)
    score_input(app, "Player 1", 2).set_value(5)
    score_input(app, "Player 2", 1).set_value(7)
    app.run()
    assert totals(app) == {"Player 1": 15, "Player 2": 7}


def test_leader_is_reported(app):
    score_input(app, "Player 1", 1).set_value(10)
    score_input(app, "Player 2", 1).set_value(7)
    app.run()
    assert [s.value for s in app.success] == ["**Player 1** is currently winning with **10** points!"]


def test_tie_is_reported(app):
    score_input(app, "Player 1", 1).set_value(10)
    score_input(app, "Player 2", 1).set_value(10)
    app.run()
    assert [i.value for i in app.info] == ["**Tie** between Player 1, Player 2 with **10** points!"]


def test_editing_an_entered_score_takes_effect_immediately():
    """Regression: on Streamlit 1.46.1 every second edit to an already-filled cell was dropped
    (the widget's identity changed with its value= argument). Fixed by Streamlit's key-based
    widget identity; this test fails if the app is ever pinned back to an affected version."""
    at = AppTest.from_file(APP_PATH, default_timeout=30)
    at.run()
    for value in (10, 11, 12, 13, 14):
        score_input(at, "Player 1", 1).set_value(value)
        at.run()
        assert totals(at)["Player 1"] == value, f"edit to {value} was ignored"


def test_changing_rounds_keeps_scores_in_the_rounds_that_remain(app):
    score_input(app, "Player 1", 1).set_value(10)
    score_input(app, "Player 1", 4).set_value(6)
    app.run()
    setting_input(app, "num_games_input").set_value(2)
    app.run()
    assert totals(app)["Player 1"] == 10  # round 4 is hidden, so it isn't counted
    setting_input(app, "num_games_input").set_value(5)
    app.run()
    assert totals(app)["Player 1"] == 16  # ...and comes back when the round is re-added


def test_adding_a_player_keeps_existing_scores(app):
    score_input(app, "Player 1", 1).set_value(10)
    app.run()
    setting_input(app, "num_players_input").set_value(3)
    app.run()
    assert totals(app) == {"Player 1": 10, "Player 2": 0, "Player 3": 0}


# --- Known problems, recorded as strict xfails so they are reproducible and flip loudly when fixed.


@pytest.mark.xfail(strict=True, reason="Score widget keys include the player's name, so renaming wipes their scores")
def test_renaming_a_player_keeps_their_scores(app):
    score_input(app, "Player 1", 1).set_value(20)
    app.run()
    name_input(app, 0).set_value("Alice")
    app.run()
    assert totals(app)["Alice"] == 20


@pytest.mark.xfail(strict=True, reason="Two players with the same name share widget keys -> duplicate-key exception (app crash)")
def test_duplicate_player_names_do_not_crash(app):
    name_input(app, 1).set_value("Player 1")
    app.run()
    assert not app.exception
