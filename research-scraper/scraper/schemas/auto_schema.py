import json
from typing import Dict, Any
from scraper.utils.logger import get_logger

logger = get_logger(__name__)


class AutoSchema:
    def __init__(self):
        pass

    def generate_schema(self, content_sample: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a JSON schema based on content sample
        """
        logger.debug(f"Generating schema from content sample: {content_sample}")

        schema = {"type": "object", "properties": {}, "required": []}

        for key, value in content_sample.items():
            if value is None:
                prop_type = "string"
            elif isinstance(value, str):
                prop_type = "string"
            elif isinstance(value, bool):
                prop_type = "boolean"
            elif isinstance(value, (int, float)):
                prop_type = "number" if isinstance(value, float) else "integer"
            elif isinstance(value, list):
                prop_type = "array"
                if value and len(value) > 0:
                    # Determine item type from first element
                    first_item = value[0]
                    if isinstance(first_item, str):
                        items_schema = {"type": "string"}
                    elif isinstance(first_item, (int, float)):
                        items_schema = {
                            "type": "number"
                            if isinstance(first_item, float)
                            else "integer"
                        }
                    elif isinstance(first_item, bool):
                        items_schema = {"type": "boolean"}
                    elif isinstance(first_item, dict):
                        items_schema = self.generate_schema(first_item)
                    else:
                        items_schema = {"type": "string"}
                else:
                    items_schema = {"type": "string"}
                schema["properties"][key] = {"type": "array", "items": items_schema}
                continue
            elif isinstance(value, dict):
                prop_type = "object"
                schema["properties"][key] = self.generate_schema(value)
                continue
            else:
                prop_type = "string"

            schema["properties"][key] = {"type": prop_type}

            # Add to required if not None and not empty
            if value is not None and value != "" and value != []:
                schema["required"].append(key)

        logger.debug(f"Generated schema: {schema}")
        return schema
