import axios from 'axios';

/**
 * Web scraper core functionality
 * Handles fetching HTML content from URLs
 */
export class Scraper {
  private timeout: number;
  private userAgent: string;
  
  constructor(timeout: number = 30000, userAgent: string = '') {
    this.timeout = timeout;
    this.userAgent = userAgent || 
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }
  
  /**
   * Fetch HTML content from a URL
   */
  async fetchHtml(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch URL ${url}: ${error.message}`);
      }
      throw error;
    }
  }
  
  /**
   * Validate if a URL is accessible
   */
  async validateUrl(url: string): Promise<boolean> {
    try {
      await axios.head(url, {
        timeout: 5000,
        headers: {
          'User-Agent': this.userAgent
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}