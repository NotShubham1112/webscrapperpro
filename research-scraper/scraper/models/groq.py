import os
from groq import Groq
from typing import Optional
from scraper.utils.logger import get_logger

logger = get_logger(__name__)


class GroqModel:
    def __init__(self, model_name: str = "mixtral-8x7b-32768"):
        self.model_name = model_name
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            logger.warning("GROQ_API_KEY not set. Groq model will not work.")
            self.client = None
        else:
            self.client = Groq(api_key=api_key)
            logger.info(f"Initialized Groq model: {model_name}")

    def generate(self, prompt: str) -> str:
        """
        Generate text using Groq API
        """
        if not self.client:
            logger.error("Groq client not initialized. Check GROQ_API_KEY.")
            return '{"content_type": "generic", "selectors": {"title": "h1", "content": "p"}, "schema": {"type": "object", "properties": {"title": {"type": "string"}, "content": {"type": "string"}}}}'

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model=self.model_name,
                temperature=0.1,
                max_tokens=1000,
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            logger.error(f"Groq generation error: {e}")
            return '{"content_type": "generic", "selectors": {"title": "h1", "content": "p"}, "schema": {"type": "object", "properties": {"title": {"type": "string"}, "content": {"type": "string"}}}}'
