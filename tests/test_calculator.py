import pytest

from calculator import CalculatorError, evaluate


@pytest.mark.parametrize(
    "expression, expected",
    [
        ("2 + 3 * 4", 14),
        ("(2 + 3) * 4", 20),
        ("10 - 4", 6),
        ("15 / 3", 5.0),
        ("(12 / 4) + 3**2", 12.0),
        ("2**3", 8),
        ("2 ** 3 ** 2", 512),  # right-associative
        ("-2 ** 2", -4),  # same precedence as Python
        ("7 // 2", 3),
        ("7 % 4", 3),
        ("-5 + +3", -2),
        ("1.5 + 2.25", 3.75),
        ("  3 + 1 + 2 + 5  ", 11),  # the in-app "CARD" example, with stray whitespace
        ("10**100", 10**100),
    ],
)
def test_evaluates_plain_arithmetic(expression, expected):
    assert evaluate(expression) == expected


@pytest.mark.parametrize(
    "expression",
    [
        # Attribute/introspection escapes: the classic route out of eval(..., {"__builtins__": {}}).
        "().__class__.__base__.__subclasses__()",
        "().__class__.__bases__[0].__subclasses__()[0]",
        "(1).__class__",
        "[].__class__.__mro__",
        # Names, calls, imports
        "__import__('os').system('id')",
        "abs(-1)",
        "open('/etc/passwd')",
        "x + 1",
        "True",
        "None",
        # Non-arithmetic literals and syntax
        "'a' * 3",
        "[1, 2, 3]",
        "(1, 2)",
        "{1: 2}",
        "1 if 1 else 2",
        "1 < 2",
        "lambda: 1",
        "[i for i in range(3)]",
        "(y := 3)",
        "1j",
        "1 and 2",
        "~5",
        "5 ^ 3",  # XOR in Python; people mean "power", so refuse rather than answer 6
        "5 & 3",
        "1 << 4",
    ],
)
def test_rejects_anything_that_is_not_arithmetic(expression):
    with pytest.raises(CalculatorError):
        evaluate(expression)


@pytest.mark.parametrize("expression", ["", "   ", None])
def test_empty_input_is_an_error(expression):
    with pytest.raises(CalculatorError, match="Enter a formula"):
        evaluate(expression)


@pytest.mark.parametrize(
    "expression, message",
    [
        ("1 / 0", "Division by zero"),
        ("1 // 0", "Division by zero"),
        ("5 % 0", "Division by zero"),
        ("0 ** -1", "Division by zero"),
        ("2 +", "Not a valid formula"),
        ("(1 + 2", "Not a valid formula"),
        ("1 2", "Not a valid formula"),
        ("\x00", "Not a valid formula"),
    ],
)
def test_bad_input_gives_a_safe_message(expression, message):
    with pytest.raises(CalculatorError, match=message):
        evaluate(expression)


@pytest.mark.parametrize(
    "expression",
    [
        "9**9**9",  # would otherwise run "forever" and exhaust memory
        "9**9**9**9",
        "((9**99)**99)**99",
        "10**5000",
        "2**4097",
        "1e308 * 10",
        "1e999",
        "1 / 1e999",  # an inf intermediate must not quietly become 0.0
        "10.0 ** 400",
        "(10**1000) / 1",
    ],
)
def test_oversized_numbers_are_refused_quickly(expression):
    with pytest.raises(CalculatorError, match="too large"):
        evaluate(expression)


def test_expression_length_is_capped():
    with pytest.raises(CalculatorError, match="too long"):
        evaluate("1+" * 150 + "1")


def test_expression_at_the_length_limit_still_works():
    assert evaluate("1" + "+1" * 99) == 100  # exactly 199 chars
    assert len("1" + "+1" * 99 + "+1") == 201  # one over the cap
    with pytest.raises(CalculatorError, match="too long"):
        evaluate("1" + "+1" * 100)


def test_deep_nesting_within_the_cap_does_not_crash():
    assert evaluate("(" * 99 + "1" + ")" * 99) == 1
    assert evaluate("-" * 199 + "1") == -1  # 199 chained unary minuses


def test_error_messages_do_not_echo_the_input():
    payload = "<script>alert(1)</script>"
    with pytest.raises(CalculatorError) as info:
        evaluate(payload)
    assert "script" not in str(info.value)
