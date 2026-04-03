from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import re
from typing import Optional
from scraper.utils.logger import get_logger

logger = get_logger(__name__)


class PaginationTool:
    def __init__(self):
        pass

    def find_next_page(self, html_content: str, current_url: str) -> Optional[str]:
        """
        Find the next page URL from pagination controls
        """
        logger.debug(f"Looking for next page in: {current_url}")

        soup = BeautifulSoup(html_content, "lxml")

        # Common patterns for next page links
        next_selectors = [
            # Text-based selectors
            'a:contains("Next")',
            'a:contains("next")',
            'a:contains("»")',
            'a:contains("›")',
            'a:contains("→")',
            # Class/id based selectors
            ".next",
            ".next-page",
            "#next",
            "#next-page",
            ".pagination__next",
            ".pager-next",
            # ARIA labels
            '[aria-label="Next"]',
            '[aria-label="next"]',
            # Rel attributes
            'link[rel="next"]',
            'a[rel="next"]',
            # Pagination structures
            ".pagination a:last-child",
            ".pager a:last-child",
            ".page-links a:last-child",
        ]

        for selector in next_selectors:
            try:
                # Handle :contains pseudo-class (not in standard CSS3)
                if ":contains(" in selector:
                    # Convert to BeautifulSoup compatible search
                    text_content = (
                        selector.split('"')[1]
                        if '"' in selector
                        else selector.split("'")[1]
                    )
                    base_selector = selector.split(":contains")[0]
                    elements = soup.select(base_selector)
                    for el in elements:
                        if text_content.lower() in el.get_text().lower():
                            next_url = el.get("href")
                            if next_url:
                                absolute_url = urljoin(current_url, next_url)
                                if self._is_valid_url(absolute_url, current_url):
                                    logger.debug(
                                        f"Found next page via text: {absolute_url}"
                                    )
                                    return absolute_url
                else:
                    elements = soup.select(selector)
                    for el in elements:
                        next_url = el.get("href")
                        if next_url:
                            absolute_url = urljoin(current_url, next_url)
                            if self._is_valid_url(absolute_url, current_url):
                                logger.debug(
                                    f"Found next page via selector {selector}: {absolute_url}"
                                )
                                return absolute_url
            except Exception as e:
                logger.debug(f"Error with selector {selector}: {e}")
                continue

        # Try to find pagination patterns in URL
        try:
            parsed = urlparse(current_url)
            # Look for page numbers in URL patterns
            page_patterns = [
                r"[?&]page=(\d+)",
                r"/page/(\d+)",
                r"[?&]p=(\d+)",
                r"/p/(\d+)",
            ]

            for pattern in page_patterns:
                match = re.search(pattern, current_url)
                if match:
                    current_page = int(match.group(1))
                    next_page = current_page + 1
                    # Replace the page number in URL
                    next_url = re.sub(
                        pattern,
                        lambda m: m.group(0).replace(str(current_page), str(next_page)),
                        current_url,
                    )
                    if next_url != current_url:
                        logger.debug(f"Found next page via URL pattern: {next_url}")
                        return next_url
        except Exception as e:
            logger.debug(f"Error in URL pattern matching: {e}")

        logger.debug("No next page found")
        return None

    def _is_valid_url(self, url: str, base_url: str) -> bool:
        """
        Check if URL is valid and belongs to same domain
        """
        try:
            parsed = urlparse(url)
            base_parsed = urlparse(base_url)

            # Must have scheme and netloc
            if not parsed.scheme or not parsed.netloc:
                return False

            # Should be same domain (or subdomain)
            return parsed.netloc == base_parsed.netloc or parsed.netloc.endswith(
                "." + base_parsed.netloc
            )
        except:
            return False
