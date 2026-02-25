import unicodedata
import re


def _remove_diacritics(value: str) -> str:
    """Odstráni diakritiku z reťazca pre účely vyhľadávania."""
    normalized = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def _sanitize_search_term(term: str) -> str:
    """Odstráni špeciálne regex znaky zo search termu aby sa zabránilo ReDoS."""
    # Escape všetky regex špeciálne znaky
    return re.escape(term)


def _build_accent_insensitive_pattern(term: str) -> str:
    """
    Vytvorí regex pattern, ktorý ignoruje diakritiku pre základné latinské písmená.
    Používame ho s __iregex, takže je case-insensitive.
    """
    # Ak term prišiel už escapnutý (re.escape), rozbaľ ho späť na literály po znakoch,
    # aby sme sa vyhli double-escapingu (napr. "\\." -> ".") a zachovali pôvodné správanie.
    unescaped_chars = []
    i = 0
    while i < len(term):
        if term[i] == "\\" and i + 1 < len(term):
            unescaped_chars.append(term[i + 1])
            i += 2
        else:
            unescaped_chars.append(term[i])
            i += 1

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
    for ch in unescaped_chars:
        lower = ch.lower()
        if lower in accent_groups:
            chars = accent_groups[lower]
            parts.append(f"[{re.escape(chars)}]")
        else:
            parts.append(re.escape(ch))
    if not parts:
        return ".*"
    return "".join(parts)
