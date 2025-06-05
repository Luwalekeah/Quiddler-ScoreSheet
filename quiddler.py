# quiddler.py

import streamlit as st
from expander import QuiddlerExpanders
from calculator import QuiddlerCalculator
from scoresheet import QuiddlerScoresheet

def main():
    """Main application function."""

    # ── 1) Page Config ──────────────────────────────────────────────────────────
    st.set_page_config(
        page_title="Quiddler Score Sheet",
        page_icon="🃏",
        layout="centered",
        initial_sidebar_state="collapsed"
    )

    # ── 2) Banner (if desired) ─────────────────────────────────────────────────
    if "first_time" not in st.session_state:
        welcome_banner = """
        <div style="
            background-color: #87CEEB;
            padding: 12px;
            border-radius: 5px;
            margin-bottom: 20px;
            text-align: center;
        ">
            <span style="font-weight:bold; color:#003366; font-size:16px;">
                Game Instructions &amp; Notes can be found at the bottom of the app.
            </span>
        </div>
        """
        st.markdown(welcome_banner, unsafe_allow_html=True)
        st.session_state.first_time = False

    # ── 3) Title ─────────────────────────────────────────────────────────────────
    st.markdown(
        """
        <h1 style="text-align:center;">🃏 Quiddler Score Sheet</h1>
        <p style="text-align:center; color:#555;">
            The award-winning short word game that's easy to learn and keeps your mind sharp.
        </p>
        """,
        unsafe_allow_html=True,
    )

    # ── 4) Calculator Interface ─────────────────────────────────────────────────
    calculator = QuiddlerCalculator()
    calculator.render_calculator()

    # ── 5) Score Sheet ───────────────────────────────────────────────────────────
    scoresheet = QuiddlerScoresheet()             # ← instantiate the class
    scoresheet.render_scoresheet()                # ← call the method

    # ── 6) Divider Before Expanders ─────────────────────────────────────────────
    st.markdown("---")

    # ── 7) Expanders at Bottom ──────────────────────────────────────────────────
    expanders = QuiddlerExpanders()
    expanders.render_all_expanders()

    # ── 8) Footer Copyright ─────────────────────────────────────────────────────
    st.markdown(
        """
        <div style="display: flex; justify-content: center; text-align: center;">
            <p>© 2025 TechTales w/ Luwah.
            <a href="https://github.com/Luwalekeah" target="_blank">GitHub</a></p>
        </div>
        """,
        unsafe_allow_html=True,
    )


if __name__ == "__main__":
    main()
