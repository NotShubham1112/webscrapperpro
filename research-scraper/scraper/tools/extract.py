from bs4 import BeautifulSoup
import re
from typing import Dict, Any
from scraper.utils.logger import get_logger
from scraper.utils.clean_text import clean_text

logger = get_logger(__name__)


class ExtractTool:
    def __init__(self):
        pass

    def extract(self, html_content: str, selectors: Dict[str, str]) -> Dict[str, Any]:
        """
        Extract content from HTML using CSS selectors
        """
        logger.info(f"Extracting content with {len(selectors)} selectors")

        soup = BeautifulSoup(html_content, "lxml")
        extracted_data = {}

        for field, selector in selectors.items():
            try:
                elements = soup.select(selector)
                if not elements:
                    logger.debug(f"No elements found for selector: {selector}")
                    extracted_data[field] = (
                        [] if "[]" in selector or selector.endswith("s") else None
                    )
                    continue

                # Handle different types of extraction
                if selector.endswith("::text") or selector.endswith("text"):
                    # Extract text content
                    texts = [
                        clean_text(el.get_text())
                        for el in elements
                        if el.get_text().strip()
                    ]
                    extracted_data[field] = (
                        texts if len(texts) > 1 else (texts[0] if texts else None)
                    )
                elif selector.endswith("::attr(href)") or "href" in selector:
                    # Extract href attributes
                    links = [el.get("href") for el in elements if el.get("href")]
                    extracted_data[field] = list(set(links))  # Remove duplicates
                elif selector.endswith("::attr(src)") or "src" in selector:
                    # Extract src attributes
                    sources = [el.get("src") for el in elements if el.get("src")]
                    extracted_data[field] = list(set(sources))  # Remove duplicates
                else:
                    # Extract element HTML or text based on context
                    if len(elements) == 1:
                        # Single element - try to get meaningful content
                        el = elements[0]
                        text = clean_text(el.get_text())
                        if text:
                            extracted_data[field] = text
                        else:
                            extracted_data[field] = str(el)
                    else:
                        # Multiple elements - extract text from each
                        texts = [
                            clean_text(el.get_text())
                            for el in elements
                            if el.get_text().strip()
                        ]
                        extracted_data[field] = texts if texts else []

            except Exception as e:
                logger.warning(
                    f"Error extracting field '{field}' with selector '{selector}': {e}"
                )
                extracted_data[field] = None

        logger.debug(f"Extracted data: {extracted_data}")
        return extracted_data
