import re
from typing import Optional, Union


def clean_text(text: Union[str, None]) -> Optional[str]:
    """
    Clean and normalize text content
    """
    if text is None:
        return None

    if not isinstance(text, str):
        text = str(text)

    # Remove extra whitespace
    text = re.sub(r"\s+", " ", text)

    # Remove leading/trailing whitespace
    text = text.strip()

    # Remove zero-width characters and other invisible chars
    text = re.sub(r"[\u200b-\u200d\ufeff]", "", text)

    # Replace smart quotes and dashes with ASCII equivalents
    replacements = {
        "\u2018": "'",  # Left single quotation mark
        "\u2019": "'",  # Right single quotation mark
        "\u201c": '"',  # Left double quotation mark
        "\u201d": '"',  # Right double quotation mark
        "\u2013": "-",  # En dash
        "\u2014": "-",  # Em dash
        "\u2026": "...",  # Horizontal ellipsis
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    return text if text else None


def clean_html_text(html_text: str) -> str:
    """
    Clean HTML text by removing tags and normalizing whitespace
    """
    if not html_text:
        return ""

    # Remove HTML tags
    text = re.sub(r"<[^>]+>", " ", html_text)

    # Clean the resulting text
    return clean_text(text) or ""
