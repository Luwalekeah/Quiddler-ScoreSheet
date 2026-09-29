import ast
import html
import math
import operator

import streamlit as st

# Longest expression we will even try to parse. Keeps parse time and nesting bounded.
MAX_EXPRESSION_LENGTH = 200
# Results larger than this many bits are rejected (about 1,200 decimal digits). This stops
# things like 9**9**9 from pinning the CPU, and stays under Python's int->str digit limit.
MAX_RESULT_BITS = 4096

_BINARY_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}
_UNARY_OPERATORS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}


class CalculatorError(ValueError):
    """Raised for input the calculator refuses to evaluate. The message is safe to show."""


def _checked(value):
    """Reject inf/nan and oversized ints so a bad intermediate value can't slip through."""
    if isinstance(value, float) and not math.isfinite(value):
        raise CalculatorError("Number is too large")
    if isinstance(value, int) and value.bit_length() > MAX_RESULT_BITS:
        raise CalculatorError("Number is too large")
    return value


def _evaluate_node(node):
    if isinstance(node, ast.Constant):
        # bool is a subclass of int; exclude it (and str, None, complex, ...).
        if type(node.value) in (int, float):
            return _checked(node.value)
        raise CalculatorError("Only numbers are allowed")

    if isinstance(node, ast.BinOp) and type(node.op) in _BINARY_OPERATORS:
        left = _evaluate_node(node.left)
        right = _evaluate_node(node.right)
        if isinstance(node.op, ast.Pow) and isinstance(left, int) and isinstance(right, int):
            # Check the size *before* computing; int ** int is unbounded.
            if right > 0 and left.bit_length() * right > MAX_RESULT_BITS:
                raise CalculatorError("Number is too large")
        return _checked(_BINARY_OPERATORS[type(node.op)](left, right))

    if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY_OPERATORS:
        return _checked(_UNARY_OPERATORS[type(node.op)](_evaluate_node(node.operand)))

    raise CalculatorError("Only + - * / // % ** and parentheses are supported")


def evaluate(expression):
    """Evaluate a plain arithmetic expression and return an int or float.

    Walks the parsed syntax tree and only ever executes arithmetic on number literals.
    Names, attribute access, calls, subscripts, comprehensions, strings, etc. are rejected,
    so nothing the user types can reach Python objects or builtins.

    Raises CalculatorError with a user-safe message on any failure.
    """
    expression = (expression or "").strip()
    if not expression:
        raise CalculatorError("Enter a formula")
    if len(expression) > MAX_EXPRESSION_LENGTH:
        raise CalculatorError(f"Formula is too long (max {MAX_EXPRESSION_LENGTH} characters)")

    try:
        tree = ast.parse(expression, mode="eval")
        return _evaluate_node(tree.body)
    except CalculatorError:
        raise
    except ZeroDivisionError:
        raise CalculatorError("Division by zero") from None
    except OverflowError:
        raise CalculatorError("Number is too large") from None
    except (SyntaxError, ValueError, RecursionError, MemoryError):
        raise CalculatorError("Not a valid formula") from None


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
            result_value = evaluate(expr)
        except CalculatorError as err:
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
                f"<p style='font-size:16pt; margin-top:12px;'>Result: {html.escape(str(st.session_state.calc_output))}</p>",
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
