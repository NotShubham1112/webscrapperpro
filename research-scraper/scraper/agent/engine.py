import json
from typing import Dict, Any, Optional
from scraper.agent.planner import Planner
from scraper.agent.synthesizer import Synthesizer
from scraper.tools.page import PageTool
from scraper.tools.extract import ExtractTool
from scraper.tools.pagination import PaginationTool
from scraper.models.model_router import ModelRouter
from scraper.utils.logger import get_logger

logger = get_logger(__name__)


class AgenticEngine:
    def __init__(
        self,
        model: str = "ollama",
        schema_name: str = "auto",
        use_browser: bool = False,
    ):
        self.model_router = ModelRouter(model)
        self.planner = Planner(self.model_router)
        self.synthesizer = Synthesizer(self.model_router)
        self.page_tool = PageTool(use_browser=use_browser)
        self.extract_tool = ExtractTool()
        self.pagination_tool = PaginationTool()
        self.schema_name = schema_name

    def run(self, url: str) -> Dict[str, Any]:
        """
        Execute the agentic workflow: plan -> scrape -> extract -> paginate -> synthesize
        """
        logger.info("Starting agentic workflow")

        # Step 1: Planning
        logger.info("Step 1: Building scraping plan")
        plan = self.planner.build_plan(url, self.schema_name)
        logger.debug(f"Plan: {plan}")

        # Step 2: Initial page load
        logger.info("Step 2: Loading initial page")
        page_content = self.page_tool.get_page(url)
        if not page_content:
            logger.error("Failed to load initial page")
            return {"error": "Failed to load page"}

        # Step 3: Content extraction
        logger.info("Step 3: Extracting content")
        extracted_data = self.extract_tool.extract(
            page_content, plan.get("selectors", {})
        )
        logger.debug(f"Extracted data: {extracted_data}")

        # Step 4: Pagination handling
        logger.info("Step 4: Handling pagination")
        all_data = [extracted_data]
        next_url = self.pagination_tool.find_next_page(page_content, url)
        page_count = 1

        while next_url and page_count < 5:  # Limit to 5 pages for safety
            logger.info(f"Scraping next page: {next_url}")
            page_content = self.page_tool.get_page(next_url)
            if not page_content:
                break

            page_data = self.extract_tool.extract(
                page_content, plan.get("selectors", {})
            )
            all_data.append(page_data)

            next_url = self.pagination_tool.find_next_page(page_content, next_url)
            page_count += 1

        # Step 5: Synthesis
        logger.info("Step 5: Synthesizing final result")
        final_result = self.synthesizer.synthesize(all_data, plan.get("schema", {}))

        logger.info("Workflow completed successfully")
        return final_result
