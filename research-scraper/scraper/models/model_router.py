from typing import Optional
from scraper.utils.logger import get_logger

logger = get_logger(__name__)


class ModelRouter:
    def __init__(self, model_name: str = "ollama"):
        self.model_name = model_name.lower()
        self.model = self._initialize_model()
        logger.info(f"ModelRouter initialized with model: {model_name}")

    def _initialize_model(self):
        """
        Initialize the appropriate model based on model_name
        """
        if self.model_name == "ollama":
            from .ollama import OllamaModel

            return OllamaModel()
        elif self.model_name == "groq":
            from .groq import GroqModel

            return GroqModel()
        elif self.model_name == "mistral":
            from .mistral import MistralModel

            return MistralModel()
        else:
            logger.warning(f"Unknown model: {self.model_name}. Defaulting to Ollama.")
            from .ollama import OllamaModel

            return OllamaModel()

    def generate(self, prompt: str) -> str:
        """
        Generate text using the selected model
        """
        logger.debug(f"Generating with {self.model_name} model")
        return self.model.generate(prompt)
