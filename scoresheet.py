# scoresheet.py

import streamlit as st
import pandas as pd

class QuiddlerScoresheet:
    """Interactive score sheet for Quiddler card game using Streamlit."""

    def __init__(self):
        self._initialize_session_state()

    def _initialize_session_state(self):
        """Initialize session state variables with defaults."""
        defaults = {
            "num_players": 2,
            "num_games": 5,
            "settings_changed": False
        }
        
        for key, value in defaults.items():
            if key not in st.session_state:
                st.session_state[key] = value

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
            **{name: [0] * st.session_state.num_games for name in player_names}
        })

    def _preserve_existing_scores(self, old_df, new_df):
        """Copy scores from old DataFrame to new one where possible."""
        if old_df is None or old_df.empty:
            return new_df
            
        # Copy existing scores for matching columns and rows
        for col in new_df.columns:
            if col in old_df.columns and col != "Round":
                min_rows = min(len(new_df), len(old_df))
                new_df.loc[:min_rows-1, col] = old_df.loc[:min_rows-1, col].values
                
        return new_df

    def _needs_dataframe_rebuild(self):
        """Check if DataFrame needs to be rebuilt due to setting changes."""
        if "df_scores" not in st.session_state:
            return True
            
        df = st.session_state["df_scores"]
        expected_cols = ["Round"] + self._get_player_names()
        
        return (
            list(df.columns) != expected_cols or 
            len(df) != st.session_state.num_games or
            st.session_state.get("settings_changed", False)
        )

    def _update_scores_dataframe(self):
        """Update or create the scores DataFrame as needed."""
        if self._needs_dataframe_rebuild():
            old_df = st.session_state.get("df_scores")
            new_df = self._create_empty_dataframe()
            
            # Preserve existing scores when rebuilding
            if old_df is not None:
                new_df = self._preserve_existing_scores(old_df, new_df)
            
            st.session_state["df_scores"] = new_df
            st.session_state["settings_changed"] = False

    def render_settings(self):
        """Render game configuration controls."""
        st.markdown("### Game Settings")
        
        col1, col2 = st.columns(2)
        
        with col1:
            new_players = st.number_input(
                "Number of players",
                min_value=2,
                max_value=8,
                value=st.session_state.num_players,
                help="How many people are playing?"
            )
            
        with col2:
            new_games = st.number_input(
                "Number of rounds",
                min_value=1,
                max_value=10,
                value=st.session_state.num_games,
                help="How many rounds to play (max 10)"
            )
        
        # Track if settings changed
        if (new_players != st.session_state.num_players or 
            new_games != st.session_state.num_games):
            st.session_state.num_players = new_players
            st.session_state.num_games = new_games
            st.session_state.settings_changed = True

    def render_player_names(self):
        """Render player name input fields."""
        st.markdown("### Player Names")
        
        cols = st.columns(st.session_state.num_players)
        names_changed = False
        
        for i in range(st.session_state.num_players):
            with cols[i]:
                old_name = st.session_state.get(f"player_name_{i}", f"Player {i + 1}")
                new_name = st.text_input(
                    f"Player {i + 1}",
                    value=old_name,
                    key=f"player_name_{i}",
                    placeholder=f"Player {i + 1}"
                )
                if new_name != old_name:
                    names_changed = True
        
        if names_changed:
            st.session_state.settings_changed = True

    def render_score_editor(self):
        """Render the interactive score table."""
        st.markdown("### Score Entry")
        
        # Ensure DataFrame is up to date
        self._update_scores_dataframe()
        
        df = st.session_state["df_scores"]
        
        # Configure column display
        column_config = {
            "Round": st.column_config.TextColumn(
                "Round", 
                disabled=True,
                width="small"
            )
        }
        
        # Configure player columns
        for col in df.columns:
            if col != "Round":
                column_config[col] = st.column_config.NumberColumn(
                    col,
                    min_value=0,
                    max_value=999,
                    step=1,
                    format="%d"
                )

        # Render data editor
        edited_df = st.data_editor(
            df,
            use_container_width=True,
            num_rows="fixed",
            column_config=column_config,
            hide_index=True,
            key="score_editor"
        )

        # Save changes
        st.session_state["df_scores"] = edited_df

    def render_totals(self):
        """Display running totals for each player."""
        if "df_scores" not in st.session_state:
            return

        df = st.session_state["df_scores"]
        player_cols = [col for col in df.columns if col != "Round"]
        
        if not player_cols:
            return

        # Calculate totals
        totals = df[player_cols].sum()
        
        st.markdown("### Current Totals")
        
        # Create totals display
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
        if "df_scores" not in st.session_state:
            return
            
        df = st.session_state["df_scores"]
        player_cols = [col for col in df.columns if col != "Round"]
        
        # Check if any scores have been entered
        if df[player_cols].sum().sum() == 0:
            return
            
        totals = df[player_cols].sum()
        max_total = totals.max()
        winners = totals[totals == max_total].index.tolist()
        
        # Only show winner if it looks like the game is complete
        # (at least half the cells have non-zero values)
        non_zero_count = (df[player_cols] != 0).sum().sum()
        total_cells = len(player_cols) * len(df)
        
        if non_zero_count >= total_cells * 0.5:
            st.markdown("### 🏆 Game Status")
            if len(winners) == 1:
                st.success(f"**{winners[0]}** is currently winning with **{int(max_total)}** points!")
            else:
                winner_names = ", ".join(winners)
                st.info(f"**Tie** between {winner_names} with **{int(max_total)}** points!")

    def render_scoresheet(self):
        """Render the complete scoresheet interface."""
        
        # Settings in expandable section
        with st.expander("⚙️ Game Settings & Player Names", expanded=True):
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
        if "df_scores" in st.session_state:
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