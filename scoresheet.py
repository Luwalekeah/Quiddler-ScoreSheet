# scoresheet.py

import streamlit as st
import pandas as pd

class QuiddlerScoresheet:
    """Class to handle interactive score sheet functionality for Quiddler, using st.data_editor."""

    def __init__(self):
        self._initialize_state()

    def _initialize_state(self):
        """Initialize session‐state variables if not already set."""
        if "num_players" not in st.session_state:
            st.session_state.num_players = 2
        if "num_games" not in st.session_state:
            st.session_state.num_games = 5
        # We will store the editable DataFrame under "df_scores" once created.

    def render_settings(self):
        """
        Render selectors for # of players and # of games.
        We do NOT supply `value=` here, since session_state already holds defaults.
        """
        c1, c2 = st.columns(2)
        with c1:
            st.number_input(
                label="Number of players",
                min_value=2,
                max_value=8,
                step=1,
                key="num_players",
                help="How many people are playing?"
            )
        with c2:
            st.number_input(
                label="Number of games (max 10)",
                min_value=1,
                max_value=10,
                step=1,
                key="num_games",
                help="How many rounds/games to track (up to 10)?"
            )
        st.markdown("---")

    def render_player_names(self):
        """Render a row of text inputs to capture each player's name."""
        st.markdown("**Player Names**")
        cols = st.columns(st.session_state.num_players)
        for i in range(st.session_state.num_players):
            default = f"Player {i + 1}"
            cols[i].text_input(
                label=f"Name {i + 1}",
                value=st.session_state.get(f"player_name_{i}", default),
                key=f"player_name_{i}"
            )

    def build_initial_dataframe(self):
        """
        Build or retrieve the DataFrame that holds the scores:
          - Always include a 'Round' column with values 1..num_games.
          - If session_state["df_scores"] exists, copy it and adjust columns/rows if needed.
          - Otherwise, create a new DataFrame with zeros for player columns.
        """
        num_p = st.session_state.num_players
        num_g = st.session_state.num_games

        # Player column labels
        player_cols = [
            st.session_state.get(f"player_name_{i}", f"Player {i + 1}")
            for i in range(num_p)
        ]

        # Base DataFrame structure: Round + player columns
        if "df_scores" in st.session_state:
            df = st.session_state["df_scores"].copy()

            # If number of columns changed, rebuild
            expected_cols = ["Round"] + player_cols
            if list(df.columns) != expected_cols or len(df) != num_g:
                # Rebuild fresh
                df = pd.DataFrame({
                    "Round": list(range(1, num_g + 1)),
                    **{col: [0] * num_g for col in player_cols}
                })
            else:
                # Update player column names if renamed
                df.columns = ["Round"] + player_cols
                # Update Round column values if num_games changed
                df["Round"] = list(range(1, num_g + 1))
        else:
            df = pd.DataFrame({
                "Round": list(range(1, num_g + 1)),
                **{col: [0] * num_g for col in player_cols}
            })

        return df

    def render_score_editor(self):
        """
        Show a single editable table for all game scores. The first column 'Round' is disabled.
        """
        st.markdown("**Enter Scores Below**")
        df = self.build_initial_dataframe()

        # Configure columns: 'Round' read-only, players numeric
        column_config = {"Round": st.column_config.TextColumn(label="Round", disabled=True)}
        for col in df.columns:
            if col != "Round":
                column_config[col] = st.column_config.NumberColumn(label=col)

        edited_df = st.data_editor(
            df,
            num_rows="fixed",
            use_container_width=True,
            column_config=column_config,
            hide_index=True,
            key="df_scores_editor"
        )

        # Store back into session_state
        st.session_state["df_scores"] = edited_df.copy()
        st.markdown("---")

    def render_totals_row(self):
        """
        Compute each player’s total from st.session_state["df_scores"]
        and display a 2-row Markdown table: header row = player names, second row = their totals.
        """
        if "df_scores" not in st.session_state:
            return

        df = st.session_state["df_scores"]
        # Exclude 'Round' column when summing
        player_cols = [col for col in df.columns if col != "Round"]
        totals = df[player_cols].sum(axis=0)

        # Build Markdown table string
        header_row = "| " + " | ".join(player_cols) + " |"
        separator_row = "| " + " | ".join(["---"] * len(player_cols)) + " |"
        value_row = "| " + " | ".join(str(int(totals[col])) for col in player_cols) + " |"

        md_table = f"{header_row}\n{separator_row}\n{value_row}"

        st.markdown("**Totals**")
        st.markdown(md_table)

    def render_scoresheet(self):
        """
        Render the full score sheet interface:
          1) Settings & Player Names inside an expander
          2) One editable score table (st.data_editor) with 'Round' column
          3) A 2-row Totals table (headers = player names; row = totals)
        """
        with st.expander("Click to Show/Hide Settings & Player Names", expanded=True):
            self.render_settings()
            self.render_player_names()

        self.render_score_editor()
        self.render_totals_row()


# If run standalone, show only the scoresheet page.
if __name__ == "__main__":
    st.set_page_config(page_title="Quiddler Score Sheet", layout="centered")
    sheet = QuiddlerScoresheet()
    sheet.render_scoresheet()
