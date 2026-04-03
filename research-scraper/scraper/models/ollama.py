import ollama
from typing import Optional
from scraper.utils.logger import get_logger

logger = get_logger(__name__)


class OllamaModel:
    def __init__(self, model_name: str = "llama2"):
        self.model_name = model_name
        logger.info(f"Initialized Ollama model: {model_name}")

    def generate(self, prompt: str) -> str:
        """
        Generate text using Ollama
        """
        try:
            response = ollama.generate(model=self.model_name, prompt=prompt)
            return response["response"]
        except Exception as e:
            logger.error(f"Ollama generation error: {e}")
            # Return a fallback response
            return '{"content_type": "generic", "selectors": {"title": "h1", "content": "p"}, "schema": {"type": "object", "properties": {"title": {"type": "string"}, "content": {"type": "string"}}}}'
