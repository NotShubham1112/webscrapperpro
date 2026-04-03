from typing import Dict, Any
from scraper.utils.logger import get_logger

logger = get_logger(__name__)


class SchemaRegistry:
    def __init__(self):
        self.schemas = {
            "product": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "price": {"type": "string"},
                    "description": {"type": "string"},
                    "images": {"type": "array", "items": {"type": "string"}},
                    "availability": {"type": "string"},
                    "rating": {"type": "number"},
                    "reviews": {"type": "integer"},
                },
                "required": ["title", "price"],
            },
            "article": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "author": {"type": "string"},
                    "date": {"type": "string"},
                    "content": {"type": "string"},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "images": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["title", "content"],
            },
            "listing": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "price": {"type": "string"},
                        "location": {"type": "string"},
                        "description": {"type": "string"},
                        "images": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["title", "price"],
                },
            },
            "event": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "date": {"type": "string"},
                    "time": {"type": "string"},
                    "location": {"type": "string"},
                    "description": {"type": "string"},
                    "organizer": {"type": "string"},
                    "url": {"type": "string"},
                },
                "required": ["title", "date", "location"],
            },
        }
        logger.info(
            f"SchemaRegistry initialized with {len(self.schemas)} predefined schemas"
        )

    def get_schema(self, schema_name: str) -> Dict[Any, Any]:
        """
        Get a predefined schema by name
        """
        schema = self.schemas.get(schema_name.lower())
        if schema:
            logger.debug(f"Retrieved schema: {schema_name}")
            return schema
        else:
            logger.warning(
                f"Schema '{schema_name}' not found. Available schemas: {list(self.schemas.keys())}"
            )
            # Return a generic schema
            return {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "content": {"type": "string"},
                },
            }

    def list_schemas(self) -> list:
        """
        List all available schema names
        """
        return list(self.schemas.keys())
