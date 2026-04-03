import json
from typing import Dict, Any
from scraper.utils.logger import get_logger

logger = get_logger(__name__)


class Planner:
    def __init__(self, model_router):
        self.model_router = model_router

    def build_plan(self, url: str, schema_name: str) -> Dict[str, Any]:
        """
        Build a scraping plan using LLM to determine selectors and approach
        """
        logger.info(f"Building plan for URL: {url} with schema: {schema_name}")

        # If schema is auto, we'll let the LLM determine what to extract
        if schema_name == "auto":
            prompt = f"""
            Analyze the URL: {url}
            Determine what type of content this page likely contains (article, product, listing, etc.)
            Suggest CSS selectors for extracting meaningful content.
            Return a JSON object with:
            - "content_type": string describing the type of content
            - "selectors": object mapping field names to CSS selectors
            - "schema": suggested schema for the extracted data
            
            Example for a product page:
            {{
                "content_type": "product",
                "selectors": {{
                    "title": "h1.product-title",
                    "price": ".price-current",
                    "description": ".product-description",
                    "images": ".product-image img"
                }},
                "schema": {{
                    "type": "object",
                    "properties": {{
                        "title": {{"type": "string"}},
                        "price": {{"type": "string"}},
                        "description": {{"type": "string"}},
                        "images": {{"type": "array", "items": {{"type": "string"}}}}
                    }}
                }}
            }}
            
            If you cannot determine specifics, return a generic plan for extracting main text content.
            Respond ONLY with valid JSON.
            """
        else:
            # Use predefined schema from registry
            from scraper.schemas.registry import SchemaRegistry

            registry = SchemaRegistry()
            schema_info = registry.get_schema(schema_name)

            prompt = f"""
            Analyze the URL: {url}
            You need to extract data according to the {schema_name} schema.
            Suggest CSS selectors for extracting the required fields.
            Schema: {json.dumps(schema_info, indent=2)}
            
            Return a JSON object with:
            - "content_type": string describing the type of content
            - "selectors": object mapping field names to CSS selectors (matching the schema)
            - "schema": the schema to use for validation
            
            Respond ONLY with valid JSON.
            """

        try:
            response = self.model_router.generate(prompt)
            # Try to parse JSON from response
            plan = json.loads(response.strip())
            logger.debug(f"Generated plan: {plan}")
            return plan
        except Exception as e:
            logger.warning(
                f"Failed to generate plan via LLM: {e}. Using fallback plan."
            )
            # Fallback plan
            return {
                "content_type": "generic",
                "selectors": {
                    "title": "h1",
                    "content": "article, main, .content",
                    "text": "p",
                },
                "schema": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "content": {"type": "string"},
                        "text": {"type": "array", "items": {"type": "string"}},
                    },
                },
            }
