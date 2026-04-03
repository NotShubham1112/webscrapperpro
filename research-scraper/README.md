# Research Scraper

An industrial-grade AI-driven agentic web scraper CLI tool.

## Features

- Agentic workflow: planning → scraping → extraction → pagination → synthesis
- Multiple LLM support: Ollama (local), Groq, Mistral
- Automatic schema generation or predefined schemas
- Browser mode with Playwright for JavaScript-heavy sites
- JSON validation and cleaning utilities
- CLI interface built with Typer

## Installation

```bash
pip install -e .
```

## Usage

Basic scraping with local Ollama model:
```bash
scrape-ai https://example.com --model ollama
```

Specify Groq model:
```bash
scrape-ai https://example.com --model groq --schema product
```

Enable browser mode for JavaScript sites:
```bash
scrape-ai https://example.com --browser
```

Save output to file:
```bash
scrape-ai https://example.com --save output.json
```

## Project Structure

```
research-scraper/
├── pyproject.toml
├── README.md
└── scraper/
    ├── __init__.py
    ├── cli.py
    ├── agent/
    │   ├── __init__.py
    │   ├── engine.py
    │   ├── planner.py
    │   └── synthesizer.py
    ├── tools/
    │   ├── __init__.py
    │   ├── page.py
    │   ├── extract.py
    │   └── pagination.py
    ├── models/
    │   ├── __init__.py
    │   ├── ollama.py
    │   ├── groq.py
    │   ├── mistral.py
    │   └── model_router.py
    ├── schemas/
    │   ├── __init__.py
    │   ├── registry.py
    │   └── auto_schema.py
    └── utils/
        ├── __init__.py
        ├── logger.py
        ├── clean_text.py
        └── validate.py
```

## License

MIT