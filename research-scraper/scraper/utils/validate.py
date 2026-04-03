import json
import re
from typing import Dict, Any, Optional
from scraper.utils.logger import get_logger

logger = get_logger(__name__)

def validate_and_fix_json(json_str: str, schema: Dict[Any, Any]) -> str:
    """
    Validate JSON against schema and attempt to fix common issues
    """
    logger.debug(f"Validating JSON against schema: {schema}")
    
    # Try to parse the JSON
    try:
        data = json.loads(json_str)
        logger.debug("JSON parsed successfully")
    except json.JSONDecodeError as e:
        logger.warning(f"Initial JSON parse failed: {e}. Attempting to fix.")
        # Try to fix common JSON issues
        json_str = _fix_common_json_issues(json_str)
        try:
            data = json.loads(json_str)
            logger.debug("JSON fixed and parsed successfully")
        except json.JSONDecodeError as e2:
            logger.error(f"Failed to fix JSON: {e2}")
            # Return a minimal valid JSON object
            return json.dumps({"error": "Invalid JSON", "details": str(e2)})
    
    # Validate against schema if it's an object schema
    if schema.get("type") == "object" and isinstance(data, dict):
        try:
            fixed_data = _validate_object(data, schema)
            return json.dumps(fixed_data, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Object validation failed: {e}. Returning original data.")
            return json_str
    elif schema.get("type") == "array" and isinstance(data, list):
        try:
            fixed_data = _validate_array(data, schema)
            return json.dumps(fixed_data, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Array validation failed: {e}. Returning original data.")
            return json_str
    else:
        # For other types or if validation not applicable, return as-is
        logger.debug("Schema validation not applicable or not object/array type")
        return json_str

def _fix_common_json_issues(json_str: str) -> str:
    """
    Fix common JSON issues like trailing commas, missing quotes, etc.
    """
    # Remove trailing commas before closing braces/brackets
    json_str = re.sub(r',\s*([}\]])', r'\1', json_str)
    
    # Fix single quotes (though this is risky)
    # Only do this if it looks like property names or simple string values
    # We'll be conservative and not auto-fix quotes to avoid breaking legitimate content
    
    # Fix missing commas between object members
    json_str = re.sub(r'([\]\}"\'])\s*([\{\[\"'])', r'\1,\2', json_str)
    
    return json_str

def _validate_object(data: Dict[Any, Any], schema: Dict[Any, Any]) -> Dict[Any, Any]:
    """
    Validate and fix an object against a schema
    """
    if not isinstance(data, dict):
        raise ValueError("Data is not an object")
    
    properties = schema.get("properties", {})
    required = schema.get("required", [])
    fixed_data = {}
    
    # Process each property in the schema
    for prop_name, prop_schema in properties.items():
        if prop_name in data:
            value = data[prop_name]
            fixed_value = _validate_value(value, prop_schema, prop_name)
            fixed_data[prop_name] = fixed_value
        elif prop_name in required:
            # Required field missing - add default based on type
            fixed_data[prop_name] = _get_default_value(prop_schema)
            logger.debug(f"Added missing required field '{prop_name}' with default value")
    
    # Keep additional properties not in schema (be permissive)
    for key, value in data.items():
        if key not in properties:
            fixed_data[key] = value
    
    return fixed_data

def _validate_array(data: list, schema: Dict[Any, Any]) -> list:
    """
    Validate and fix an array against a schema
    """
    if not isinstance(data, list):
        raise ValueError("Data is not an array")
    
    items_schema = schema.get("items", {})
    fixed_data = []
    
    for i, item in enumerate(data):
        try:
            fixed_item = _validate_value(item, items_schema, f"array[{i}]")
            fixed_data.append(fixed_item)
        except Exception as e:
            logger.warning(f"Failed to validate array item {i}: {e}. Skipping item.")
            # Skip invalid items rather than breaking the whole array
    
    return fixed_data

def _validate_value(value: Any, schema: Dict[Any, Any], field_name: str) -> Any:
    """
    Validate and fix a single value against a schema
    """
    if schema is None:
        return value
    
    schema_type = schema.get("type")
    
    # Handle null values
    if value is None:
        if schema_type != "null" and "null" not in schema.get("anyOf", []):
            # Try to provide a default based on type
            return _get_default_value(schema)
        return None
    
    # Type validation and fixing
    if schema_type == "string":
        if not isinstance(value, str):
            return str(value)
        return value
    
    elif schema_type == "number":
        if isinstance(value, (int, float)):
            return float(value) if '.' in str(value) or 'e' in str(value).lower() else int(value)
        try:
            if '.' in str(value) or 'e' in str(value).lower():
                return float(value)
            else:
                return int(value)
        except (ValueError, TypeError):
            return 0
    
    elif schema_type == "integer":
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        try:
            return int(float(value))  # Handle string numbers like "123.45"
        except (ValueError, TypeError):
            return 0
    
    elif schema_type == "boolean":
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower() in ('true', 'yes', '1', 'on')
        return bool(value)
    
    elif schema_type == "array":
        if not isinstance(value, list):
            # Try to convert string to array if it looks like a list
            if isinstance(value, str):
                try:
                    # Try parsing as JSON array
                    parsed = json.loads(value)
                    if isinstance(parsed, list):
                        value = parsed
                    else:
                        value = [value]
                except json.JSONDecodeError:
                    # Split by commas if it looks like a comma-separated list
                    if ',' in value:
                        value = [item.strip() for item in value.split(',')]
                    else:
                        value = [value]
            else:
                value = [value]
        
        items_schema = schema.get("items", {})
        return [_validate_value(item, items_schema, f"{field_name}[{i}]") for i, item in enumerate(value)]
    
    elif schema_type == "object":
        if not isinstance(value, dict):
            if isinstance(value, str):
                try:
                    value = json.loads(value)
                except json.JSONDecodeError:
                    # Can't convert string to object, return empty object
                    logger.warning(f"Cannot convert string to object for field {field_name}")
                    return {}
            else:
                # Can't convert non-string to object
                logger.warning(f"Cannot convert non-dict to object for field {field_name}")
                return {}
        return _validate_object(value, schema)
    
    # If we don't recognize the type, return as-is
    return value

def _get_default_value(schema: Dict[Any, Any]) -> Any:
    """
    Get a default value based on schema type
    """
    schema_type = schema.get("type")
    
    if schema_type == "string":
        return ""
    elif schema_type == "number":
        return 0
    elif schema_type == "integer":
        return 0
    elif schema_type == "boolean":
        return False
    elif schema_type == "array":
        return []
    elif schema_type == "object":
        return {}
    else:
        return None