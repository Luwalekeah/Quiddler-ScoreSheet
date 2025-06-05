import streamlit as st

class QuiddlerCalculator:
    """Class to handle calculator functionality for Quiddler scoresheet."""
    
    def __init__(self):
        self.initialize_state()
    
    def initialize_state(self):
        """Initialize session state variables."""
        if "calc_output" not in st.session_state:
            st.session_state.calc_output = ""
    
    def handle_calculation(self):
        """Handle the calculation when button is pressed."""
        expr = st.session_state.calc_input
        try:
            # Safe evaluation with restricted builtins
            result_value = eval(expr, {"__builtins__": {}}, {})
        except Exception as err:
            result_value = f"Error: {err}"
        
        st.session_state.calc_output = result_value
        st.session_state.calc_input = ""  # clear the input for the next entry
    
    def render_calculator_input(self):
        """Render the calculator input section."""
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
            st.button("Calculate", on_click=self.handle_calculation)
    
    def render_calculator_output(self):
        """Render the calculator output section."""
        if st.session_state.calc_output != "":
            st.markdown(
                f"<p style='font-size:16pt; margin-top:12px;'>Result: {st.session_state.calc_output}</p>",
                unsafe_allow_html=True,
            )
    
    def render_calculator(self):
        """Render the complete calculator interface."""
        self.render_calculator_input()
        self.render_calculator_output()
    
    def clear_output(self):
        """Clear the calculator output (utility method)."""
        st.session_state.calc_output = ""
    
    def get_last_result(self):
        """Get the last calculation result (utility method)."""
        return st.session_state.calc_output