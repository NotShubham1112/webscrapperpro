import requests
from bs4 import BeautifulSoup
from typing import Optional
from scraper.utils.logger import get_logger
from playwright.sync_api import sync_playwright

logger = get_logger(__name__)


class PageTool:
    def __init__(self, use_browser: bool = False):
        self.use_browser = use_browser
        self._playwright = None
        self._browser = None

    def _init_browser(self):
        if not self._playwright:
            self._playwright = sync_playwright().start()
            self._browser = self._playwright.chromium.launch(headless=True)

    def get_page(self, url: str) -> Optional[str]:
        """
        Fetch page content using requests or Playwright
        """
        logger.info(f"Fetching page: {url} (browser: {self.use_browser})")

        try:
            if self.use_browser:
                return self._get_page_browser(url)
            else:
                return self._get_page_requests(url)
        except Exception as e:
            logger.error(f"Error fetching page {url}: {e}")
            return None

    def _get_page_requests(self, url: str) -> Optional[str]:
        """Fetch page using requests and BeautifulSoup"""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            return response.text
        except Exception as e:
            logger.error(f"Requests error for {url}: {e}")
            return None

    def _get_page_browser(self, url: str) -> Optional[str]:
        """Fetch page using Playwright"""
        try:
            if not self._browser:
                self._init_browser()

            page = self._browser.new_page()
            page.goto(url, wait_until="networkidle", timeout=30000)
            content = page.content()
            page.close()
            return content
        except Exception as e:
            logger.error(f"Browser error for {url}: {e}")
            return None

    def close(self):
        """Close browser resources"""
        if self._browser:
            self._browser.close()
        if self._playwright:
            self._playwright.stop()
