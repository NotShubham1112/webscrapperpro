import typer
import json
from typing import Optional
from scraper.agent.engine import AgenticEngine
from scraper.utils.logger import get_logger

app = typer.Typer(help="AI-driven agentic web scraper CLI")
logger = get_logger(__name__)


@app.command()
def scrape(
    url: str = typer.Argument(..., help="URL to scrape"),
    model: str = typer.Option("ollama", help="Model to use (ollama, groq, mistral)"),
    schema: str = typer.Option(
        "auto", help="Schema to use (auto or schema name from registry)"
    ),
    browser: bool = typer.Option(
        False, help="Enable browser mode for JavaScript sites"
    ),
    save: Optional[str] = typer.Option(None, help="Save output to JSON file"),
    verbose: bool = typer.Option(False, help="Enable verbose logging"),
):
    """
    Scrape a website using AI agentic workflow.
    """
    if verbose:
        logger.set_level("DEBUG")

    logger.info(f"Starting scrape of {url} with {model} model")

    # Initialize the agentic engine
    engine = AgenticEngine(model=model, schema_name=schema, use_browser=browser)

    # Run the scraping workflow
    result = engine.run(url)

    # Output result
    if save:
        with open(save, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        logger.info(f"Results saved to {save}")
    else:
        typer.echo(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    app()
