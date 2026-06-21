"""BOD 12e: sprísnená validácia ID zoznamu v portfolio views."""

from portfolio.views import _parse_id_list


def test_accepts_real_int_list():
    assert _parse_id_list([1, 2, 3]) == [1, 2, 3]


def test_accepts_digit_strings():
    assert _parse_id_list(["1", "42"]) == [1, 42]


def test_rejects_float_values():
    # int(1.9) by ticho skrátil na 1 – musí byť odmietnuté.
    assert _parse_id_list([1.9]) is None
    assert _parse_id_list([1, 2.0]) is None


def test_rejects_decimal_strings():
    assert _parse_id_list(["1.9"]) is None
    assert _parse_id_list(["3.0"]) is None


def test_rejects_non_ascii_digit_strings():
    # "²" je isdigit()=True, ale int("²") by spadlo – isascii() to odfiltruje.
    assert _parse_id_list(["²"]) is None


def test_rejects_bool():
    assert _parse_id_list([True]) is None
    assert _parse_id_list([1, False]) is None


def test_rejects_zero_and_negative():
    assert _parse_id_list([0]) is None
    assert _parse_id_list([-1]) is None


def test_rejects_non_list_and_garbage():
    assert _parse_id_list("nope") is None
    assert _parse_id_list([None]) is None
    assert _parse_id_list([{}]) is None
