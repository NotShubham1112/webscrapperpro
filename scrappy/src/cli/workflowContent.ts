/**
 * Cosmic Scrappy Workflow Content
 * Following strict rules: No asterisks, No markdown.
 */

export const WORKFLOW_PROSE = {
  word: {
    title: "Cosmic Scrappy Feature Overview",
    sections: [
      {
        heading: "Introduction to Cosmic Scrappy",
        content: "Cosmic Scrappy is a professional grade agentic web intelligence platform designed for high performance data extraction and analysis. It combines advanced large language models with robust scraping utilities to turn raw web data into actionable insights. The system is built with a focus on reliability, scalability, and ease of use for modern data teams."
      },
      {
        heading: "Core Features",
        content: "1. Agentic reasoning for complex research tasks.\n2. Multi provider LLM support including Ollama and OpenRouter.\n3. Real time stock market and financial data retrieval.\n4. Automatic README generation for software repositories.\n5. Recursive web crawling with configurable depth."
      },
      {
        heading: "Supported Data Extraction Methods",
        content: "The platform supports various extraction techniques to handle different web architectures:\n- Static HTML parsing via Cheerio.\n- Dynamic content handling for JavaScript heavy sites.\n- Financial data endpoints for market analysis.\n- Structured metadata extraction from social media and news platforms."
      },
      {
        heading: "Supported File Output Formats",
        content: "Users can export their results in several professional formats:\n- Microsoft Word for detailed reports.\n- Microsoft Excel for structured data analysis.\n- Portable Document Format (PDF) for distribution.\n- JSON for programmatic integration.\n- Plain text for simple logs and metadata."
      },
      {
        heading: "Folder Structure Standards",
        content: "Cosmic Scrappy maintains a clean directory hierarchy for all outputs. By default, files are organized in a timestamped folder within the user's home directory. The structure includes dedicated subdirectories for logs, raw data, and finalized reports to ensure data integrity and easy retrieval."
      },
      {
        heading: "Workflow Pipeline Explanation",
        content: "The typical pipeline consists of four major stages:\n1. Input Processing: Parsing user queries and identifying target sources.\n2. Data Retrieval: Executing web search and scraping modules.\n3. Analysis: Applying AI models to summarize and structure the retrieved data.\n4. Export: Generating formatted documents based on user preferences."
      },
      {
        heading: "Error Handling and Logging",
        content: "Reliability is managed through comprehensive error catching mechanisms. The system logs all tool executions and API responses to local files. In case of network failures or scraping blocks, the agent automatically attempts retries or suggests alternative approaches to the user."
      },
      {
        heading: "Scheduling and Automation",
        content: "For recurring tasks, Cosmic Scrappy supports basic scheduling. Users can define task frequencies and priorities in the configuration file. This allows for automated market monitoring, periodic SEO audits, and regular competitor research without manual intervention."
      },
      {
        heading: "Recommended Best Practices",
        content: "To get the most out of Cosmic Scrappy, users should:\n- Use specific and clear research queries.\n- Regularly update the configuration to use the best performing AI models.\n- Review output files in the dedicated folder after each run.\n- Monitor local logs to troubleshoot any site specific scraping issues."
      },
      {
        heading: "Appendix: Configuration Parameters",
        content: "Key settings available in the config file include:\n- defaultModel: The default AI provider and model name.\n- maxIterations: The limit for agent thinking loops.\n- requestTimeout: Network timeout in milliseconds.\n- userAgent: The custom header used for web requests."
      }
    ]
  },
  excel: {
    sheet1: {
      name: "Scraper Modules",
      columns: ["Module Name", "Purpose", "Input Type", "Output Type", "Notes"],
      data: [
        ["WebSearch", "Initial discovery of relevant URLs", "Search Query", "URL List", "Uses privacy focused search engines"],
        ["LinkExtractor", "Gathering all internal and external links", "URL", "JSON Array", "Useful for mapping site structures"],
        ["TableScraper", "Extracting tabular data from web pages", "URL", "Excel Workbook", "Identifies all HTML tables automatically"],
        ["FinancialAgent", "Fetching real time stock and market info", "Ticker Symbol", "Financial Report", "Integrates with Yahoo Finance"]
      ]
    },
    sheet2: {
      name: "Data Fields Extracted",
      columns: ["Field", "Description", "Data Type", "Source", "Required"],
      data: [
        ["page_title", "The text title of the web page", "String", "HTML Head", "Yes"],
        ["main_content", "The primary text body of the URL", "String", "HTML Body", "Yes"],
        ["meta_desc", "SEO description of the page", "String", "Meta Tag", "No"],
        ["publish_date", "Date when the content was posted", "DateTime", "Schema JSON", "No"]
      ]
    },
    sheet3: {
      name: "Task Schedule",
      columns: ["Task Name", "Frequency", "Priority", "Status"],
      data: [
        ["Daily Market Wrap", "Daily", "High", "Active"],
        ["Weekly Competitor Scan", "Weekly", "Medium", "Pending"],
        ["Monthly SEO Audit", "Monthly", "Low", "Paused"]
      ]
    }
  },
  json: {
    configName: "Cosmic Scrappy Default Config",
    version: "1.0.0",
    settings: {
      inputSources: ["web_search", "direct_url", "local_files"],
      extractionRules: {
        timeout: 5000,
        retryLimit: 3,
        followRedirects: true
      },
      outputFormats: ["docx", "xlsx", "pdf", "json", "txt"],
      retryLogic: {
        strategy: "exponential_backoff",
        maxDelay: 30000
      },
      loggingSettings: {
        level: "info",
        path: "./logs/scrappy.log",
        rotation: "daily"
      },
      performanceOptions: {
        concurrency: 5,
        cacheEnabled: true
      }
    }
  }
};
