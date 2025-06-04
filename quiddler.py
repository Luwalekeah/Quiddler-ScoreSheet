import streamlit as st

# ── 1. Page Config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Quick Calculator",
    layout="centered",
)

# ── 2. State Initialization ─────────────────────────────────────────────────────
if "calc_output" not in st.session_state:
    st.session_state.calc_output = ""

# ── 3. Callback Definition ──────────────────────────────────────────────────────
def handle_calculation():
    expr = st.session_state.calc_input
    try:
        result_value = eval(expr, {"__builtins__": {}}, {})
    except Exception as err:
        result_value = f"Error: {err}"
    st.session_state.calc_output = result_value
    st.session_state.calc_input = ""  # clear the input for the next entry

# ── 4. UI: Title ────────────────────────────────────────────────────────────────
st.title("🧮 Quiddler ScoreSheet")

# ── 5. UI: Label + Input in Left Column, Button in Right Column ─────────────────
col_left, col_right = st.columns([4, 1], gap="small")

with col_left:
    st.markdown("Enter a math formula:")
    st.text_input(
        label="formula",
        key="calc_input",
        placeholder="e.g. (12 / 4) + 3**2",
        label_visibility="collapsed",
    )

with col_right:
    # Add some space to align with the input field
    st.markdown("&nbsp;")  # Empty space where the label would be
    st.button("Calculate", on_click=handle_calculation)

# ── 6. UI: Display the Result Below ───────────────────────────────────────────────
if st.session_state.calc_output != "":
    st.markdown(
        f"<p style='font-size:16pt; margin-top:12px;'>Result: {st.session_state.calc_output}</p>",
        unsafe_allow_html=True,
    )