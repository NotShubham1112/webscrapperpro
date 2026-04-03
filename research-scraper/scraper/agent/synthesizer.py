import json
from typing import Dict, Any, List
from scraper.utils.logger import get_logger
from scraper.utils.validate import validate_and_fix_json

logger = get_logger(__name__)


class Synthesizer:
    def __init__(self, model_router):
        self.model_router = model_router

    def synthesize(
        self, data_list: List[Dict[Any, Any]], schema: Dict[Any, Any]
    ) -> Dict[Any, Any]:
        """
        Synthesize extracted data from multiple pages into final JSON output
        """
        logger.info(f"Synthesizing data from {len(data_list)} pages")

        # Combine data from all pages
        combined_data = {}
        for i, data in enumerate(data_list):
            for key, value in data.items():
                if key not in combined_data:
                    combined_data[key] = []
                if isinstance(value, list):
                    combined_data[key].extend(value)
                else:
                    combined_data[key].append(value)

        # Deduplicate arrays
        for key, value in combined_data.items():
            if isinstance(value, list):
                # Remove duplicates while preserving order
                seen = set()
                unique_list = []
                for item in value:
                    if item not in seen:
                        seen.add(item)
                        unique_list.append(item)
                combined_data[key] = unique_list

        # If schema is provided, try to validate and fix the output
        if schema and schema.get("type") == "object":
            try:
                # Convert to JSON string for validation
                json_str = json.dumps(combined_data, ensure_ascii=False)
                fixed_json_str = validate_and_fix_json(json_str, schema)
                result = json.loads(fixed_json_str)
                logger.debug(f"Synthesized and validated data: {result}")
                return result
            except Exception as e:
                logger.warning(
                    f"Failed to validate synthesized data: {e}. Returning combined data."
                )
                return combined_data
        else:
            logger.debug(f"Synthesized data (no validation): {combined_data}")
            return combined_data
