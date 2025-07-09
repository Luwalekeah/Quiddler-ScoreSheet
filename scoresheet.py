import streamlit as st
import pandas as pd
import numpy as np

class QuiddlerScoresheet:
    """Interactive score sheet for Quiddler card game using Streamlit."""

    def __init__(self):
        self._initialize_session_state()

    def _initialize_session_state(self):
        """Initialize session state variables with defaults."""
        defaults = {
            "num_players": 2,
            "num_games": 5,
            "settings_changed": False,
            "df_scores": None
        }
        
        for key, value in defaults.items():
            if key not in st.session_state:
                st.session_state[key] = value
        
        # Ensure player names are initialized in session state
        for i in range(defaults["num_players"]):
            if f"player_name_{i}" not in st.session_state:
                st.session_state[f"player_name_{i}"] = f"Player {i + 1}"

    def _get_player_names(self):
        """Get current player names from session state."""
        return [
            st.session_state.get(f"player_name_{i}", f"Player {i + 1}")
            for i in range(st.session_state.num_players)
        ]

    def _create_empty_dataframe(self):
        """Create a new DataFrame with current settings."""
        player_names = self._get_player_names()
        return pd.DataFrame({
            "Round": list(range(1, st.session_state.num_games + 1)),
            **{name: [None] * st.session_state.num_games for name in player_names}
        })

    def _preserve_existing_scores_in_session(self, old_df):
        """Preserve existing scores when structure changes by copying to session state."""
        if old_df is None or old_df.empty:
            return
            
        # Initialize scores dict if not exists
        if "scores" not in st.session_state:
            st.session_state.scores = {}
        
        # Copy existing scores to session state
        for col in old_df.columns:
            if col != "Round":
                for idx, row in old_df.iterrows():
                    round_num = row["Round"]
                    score_value = row[col]
                    if pd.notna(score_value) and score_value is not None:
                        score_key = f"score_{col}_{round_num}"
                        st.session_state.scores[score_key] = score_value

    def _update_dataframe_from_scores(self):
        """Update the DataFrame based on individual score entries."""
        player_names = self._get_player_names()
        
        # Create new DataFrame structure
        df_data = {"Round": list(range(1, st.session_state.num_games + 1))}
        
        for player in player_names:
            player_scores = []
            for round_num in range(1, st.session_state.num_games + 1):
                score_key = f"score_{player}_{round_num}"
                score = st.session_state.scores.get(score_key, None)
                player_scores.append(score)
            df_data[player] = player_scores
        
        # Update the DataFrame in session state
        st.session_state["df_scores"] = pd.DataFrame(df_data)

    def _preserve_existing_scores(self, old_df, new_df):
        """Copy scores from old DataFrame to new one where possible."""
        if old_df is None or old_df.empty:
            return new_df
            
        # First preserve in session state
        self._preserve_existing_scores_in_session(old_df)
        
        # Then update the new DataFrame from session state
        self._update_dataframe_from_scores()
        
        return st.session_state["df_scores"]

    def _needs_dataframe_rebuild(self):
        """Check if DataFrame needs to be rebuilt due to setting changes or initial load."""
        if st.session_state["df_scores"] is None:
            return True
            
        df = st.session_state["df_scores"]
        expected_cols = ["Round"] + self._get_player_names()
        
        # Only rebuild if structure actually changed (columns or number of rows)
        return (
            list(df.columns) != expected_cols or 
            len(df) != st.session_state.num_games
        )

    def _update_scores_dataframe(self):
        """Update or create the scores DataFrame as needed."""
        if self._needs_dataframe_rebuild():
            old_df = st.session_state["df_scores"]
            new_df = self._create_empty_dataframe()
            
            if old_df is not None:
                new_df = self._preserve_existing_scores(old_df, new_df)
            
            st.session_state["df_scores"] = new_df

    def render_settings(self):
        """Render game configuration controls."""
        st.markdown("### Game Settings")
        
        col1, col2 = st.columns(2)
        
        current_num_players = st.session_state.num_players
        current_num_games = st.session_state.num_games

        with col1:
            new_players = st.number_input(
                "Number of players",
                min_value=2,
                max_value=8,
                value=current_num_players,
                help="How many people are playing?",
                key="num_players_input"
            )
            
        with col2:
            new_games = st.number_input(
                "Number of rounds",
                min_value=1,
                max_value=10,
                value=current_num_games,
                help="How many rounds to play (max 10)",
                key="num_games_input"
            )
        
        if new_players != current_num_players:
            st.session_state.num_players = new_players
            st.session_state.settings_changed = True
            for i in range(current_num_players, new_players):
                if f"player_name_{i}" not in st.session_state:
                    st.session_state[f"player_name_{i}"] = f"Player {i + 1}"
        
        if new_games != current_num_games:
            st.session_state.num_games = new_games
            st.session_state.settings_changed = True

    def render_player_names(self):
        """Render player name input fields."""
        st.markdown("### Player Names")
        
        cols = st.columns(st.session_state.num_players)
        
        for i in range(st.session_state.num_players):
            with cols[i]:
                # Use text_input and let session state handle the value automatically
                st.text_input(
                    f"Player {i + 1}",
                    key=f"player_name_{i}",
                    placeholder=f"Player {i + 1}"
                )
                
                # Note: We don't need to manually track name changes here
                # The _needs_dataframe_rebuild() method will detect column changes

    def render_score_editor(self):
        """Render the interactive score table using individual input fields."""
        st.markdown("### Score Entry")
        
        # Get player names
        player_names = self._get_player_names()
        
        # Initialize scores in session state if not exists
        if "scores" not in st.session_state:
            st.session_state.scores = {}
        
        # Create a table-like layout
        # Header row
        header_cols = st.columns([1] + [2] * len(player_names))
        with header_cols[0]:
            st.write("**Round**")
        for i, player in enumerate(player_names):
            with header_cols[i + 1]:
                st.write(f"**{player}**")
        
        # Score entry rows
        for round_num in range(1, st.session_state.num_games + 1):
            cols = st.columns([1] + [2] * len(player_names))
            
            with cols[0]:
                st.write(f"Round {round_num}")
            
            for i, player in enumerate(player_names):
                with cols[i + 1]:
                    score_key = f"score_{player}_{round_num}"
                    
                    # Initialize score if not exists
                    if score_key not in st.session_state.scores:
                        st.session_state.scores[score_key] = None
                    
                    # Create number input for this cell
                    score_value = st.number_input(
                        label="",
                        min_value=0,
                        max_value=999,
                        value=st.session_state.scores[score_key] if st.session_state.scores[score_key] is not None else 0,
                        step=1,
                        key=score_key,
                        label_visibility="collapsed"
                    )
                    
                    # Update session state
                    st.session_state.scores[score_key] = score_value if score_value > 0 else None
        
        # Update the DataFrame based on the individual scores
        self._update_dataframe_from_scores()

    def render_totals(self):
        """Display running totals for each player."""
        if "df_scores" not in st.session_state or st.session_state["df_scores"] is None:
            return

        df = st.session_state["df_scores"]
        player_cols = [col for col in df.columns if col != "Round"]
        
        if not player_cols:
            return

        # Calculate totals: Handle None/NaN values properly
        totals = df[player_cols].fillna(0).astype(int).sum()
        
        st.markdown("### Current Totals")
        
        # Create totals display with Streamlit metrics
        total_cols = st.columns(len(player_cols))
        for i, (player, total) in enumerate(zip(player_cols, totals)):
            with total_cols[i]:
                st.metric(
                    label=player,
                    value=int(total),
                    help=f"Total score for {player}"
                )

    def render_game_summary(self):
        """Display game summary and winner if all rounds completed."""
        if "df_scores" not in st.session_state or st.session_state["df_scores"] is None:
            return
            
        df = st.session_state["df_scores"]
        player_cols = [col for col in df.columns if col != "Round"]
        
        if not player_cols:
            return

        # Check if any scores have been entered yet
        if df[player_cols].fillna(0).astype(int).sum().sum() == 0:
            return
            
        # Calculate totals for summary
        totals = df[player_cols].fillna(0).astype(int).sum()
        max_total = totals.max()
        winners = totals[totals == max_total].index.tolist()
        
        # Criteria for showing game status: at least some scores entered
        non_zero_count = (df[player_cols].fillna(0).astype(int) != 0).sum().sum()
        
        if non_zero_count > 0:
            st.markdown("---")
            st.markdown("### 🏆 Game Status")
            if len(winners) == 1:
                st.success(f"**{winners[0]}** is currently winning with **{int(max_total)}** points!")
            else:
                winner_names = ", ".join(winners)
                st.info(f"**Tie** between {winner_names} with **{int(max_total)}** points!")

    def render_scoresheet(self):
        """Render the complete scoresheet interface."""
        # Update DataFrame before rendering components, but only if needed
        self._update_scores_dataframe()

        with st.expander("⚙️ Game Settings & Player Names", expanded=False):
            self.render_settings()
            st.divider()
            self.render_player_names()

        st.divider()
        
        # Main score entry
        self.render_score_editor()
        
        st.divider()
        
        # Totals and summary
        col1, col2 = st.columns([2, 1])
        with col1:
            self.render_totals()
        with col2:
            self.render_game_summary()

    def export_scores(self):
        """Export scores to CSV (future enhancement)."""
        if "df_scores" in st.session_state and st.session_state["df_scores"] is not None:
            return st.session_state["df_scores"].to_csv(index=False)
        return None


def main():
    """Main application entry point."""
    st.set_page_config(
        page_title="Quiddler Score Sheet",
        page_icon="🃏",
        layout="centered",
        initial_sidebar_state="collapsed"
    )
    
    scoresheet = QuiddlerScoresheet()
    scoresheet.render_scoresheet()


if __name__ == "__main__":
    main()