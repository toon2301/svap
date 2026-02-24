import unicodedata
import re


def _remove_diacritics(value: str) -> str:
    """Odstráni diakritiku z reťazca pre účely vyhľadávania."""
    normalized = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def _build_accent_insensitive_pattern(term: str) -> str:
    """
    Vytvorí regex pattern, ktorý ignoruje diakritiku pre základné latinské písmená.
    Používame ho s __iregex, takže je case-insensitive.
    """
    # Mapovanie základných písmen na skupinu s diakritikou
    accent_groups = {
        "a": "aáä",
        "c": "cč",
        "d": "dď",
        "e": "eéě",
        "i": "ií",
        "l": "lľĺ",
        "n": "nň",
        "o": "oóô",
        "r": "rŕ",
        "s": "sš",
        "t": "tť",
        "u": "uúů",
        "y": "yý",
        "z": "zž",
    }

    parts = []
    for ch in term:
        lower = ch.lower()
        if lower in accent_groups:
            chars = accent_groups[lower]
            parts.append(f"[{re.escape(chars)}]")
        else:
            parts.append(re.escape(ch))
    if not parts:
        return ".*"
    return "".join(parts)
