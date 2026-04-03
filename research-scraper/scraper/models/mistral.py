import os
from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage
from typing import Optional
from scraper.utils.logger import get_logger

logger = get_logger(__name__)


class MistralModel:
    def __init__(self, model_name: str = "mistral-tiny"):
        self.model_name = model_name
        api_key = os.getenv("MISTRAL_API_KEY")
        if not api_key:
            logger.warning("MISTRAL_API_KEY not set. Mistral model will not work.")
            self.client = None
        else:
            self.client = MistralClient(api_key=api_key)
            logger.info(f"Initialized Mistral model: {model_name}")

    def generate(self, prompt: str) -> str:
        """
        Generate text using Mistral API
        """
        if not self.client:
            logger.error("Mistral client not initialized. Check MISTRAL_API_KEY.")
            return '{"content_type": "generic", "selectors": {"title": "h1", "content": "p"}, "schema": {"type": "object", "properties": {"title": {"type": "string"}, "content": {"type": "string"}}}}'

        try:
            messages = [ChatMessage(role="user", content=prompt)]
            chat_response = self.client.chat(
                model=self.model_name,
                messages=messages,
                temperature=0.1,
                max_tokens=1000,
            )
            return chat_response.choices[0].message.content
        except Exception as e:
            logger.error(f"Mistral generation error: {e}")
            return '{"content_type": "generic", "selectors": {"title": "h1", "content": "p"}, "schema": {"type": "object", "properties": {"title": {"type": "string"}, "content": {"type": "string"}}}}'
