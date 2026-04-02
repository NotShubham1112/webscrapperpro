import * as cheerio from 'cheerio';

/**
 * HTML extractor core functionality
 * Handles extracting text, links, and tables from HTML content
 */
export class Extractor {
  /**
   * Load HTML content with Cheerio
   */
  private loadHtml(html: string) {
    return cheerio.load(html);
  }
  
  /**
   * Extract text content from HTML
   * Attempts to get meaningful title and summary
   */
  extractText(html: string): any {
    const $ = this.loadHtml(html);
    
    // Remove script and style elements
    $('script, style, nav, footer, header').remove();
    
    // Try to get title from various sources
    let title = $('title').first().text().trim();
    if (!title) {
      // Try h1
      title = $('h1').first().text().trim();
    }
    if (!title) {
      // Try og:title meta tag
      title = $('meta[property="og:title"]').attr('content')?.trim() || '';
    }
    if (!title) {
      // Try twitter:title meta tag
      title = $('meta[name="twitter:title"]').attr('content')?.trim() || '';
    }
    
    // Extract summary/description
    let summary = '';
    // Try meta description
    summary = $('meta[name="description"]').attr('content')?.trim() || '';
    // Try og:description
    if (!summary) {
      summary = $('meta[property="og:description"]').attr('content')?.trim() || '';
    }
    // Try first paragraph
    if (!summary) {
      const firstPara = $('p').first().text().trim();
      if (firstPara.length > 50) { // Only use if substantial
        summary = firstPara;
      }
    }
    
    // Extract all paragraphs
    const paragraphs: string[] = [];
    $('p').each((_, element) => {
      const text = $(element).text().trim();
      if (text.length > 20) { // Filter out very short paragraphs
        paragraphs.push(text);
      }
    });
    
    // Limit paragraphs and remove duplicates
    const uniqueParagraphs = [...new Set(paragraphs)];
    
    return {
      title: title,
      summary: summary,
      paragraphs: uniqueParagraphs.slice(0, 10) // Limit to 10 paragraphs
    };
  }
  
  /**
   * Extract links from HTML
   */
  extractLinks(html: string): Array<{text: string; url: string}> {
    const $ = this.loadHtml(html);
    const links: Array<{text: string; url: string}> = [];
    
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();
      
      if (href && text.length > 0) {
        // Filter out empty anchors and javascript links
        if (!href.startsWith('javascript:') && href !== '#') {
          links.push({
            text: text,
            url: href
          });
        }
      }
    });
    
    // Remove duplicates based on URL
    const uniqueLinks = links.filter(
      (link, index, self) => 
        index === self.findIndex(l => l.url === link.url)
    );
    
    return uniqueLinks.slice(0, 50); // Limit to 50 links
  }
  
  /**
   * Extract tables from HTML
   */
  extractTables(html: string): Array<any> {
    const $ = this.loadHtml(html);
    const tables: Array<any> = [];
    
    $('table').each((_, tableElement) => {
      const $table = $(tableElement);
      const rows: Array<any> = [];
      
      // Extract headers
      const headers: string[] = [];
      $table.find('th').each((_, headerElement) => {
        headers.push($(headerElement).text().trim());
      });
      
      // If no headers found, try to use first row as headers
      if (headers.length === 0) {
        $table.find('tr').first().find('td').each((_, cellElement) => {
          headers.push($(cellElement).text().trim());
        });
      }
      
      // Extract rows
      $table.find('tr').each((rowIndex, rowElement) => {
        // Skip header row if we already processed it
        if (rowIndex === 0 && headers.length > 0) {
          // Check if this row contains th elements (headers)
          if ($(rowElement).find('th').length === 0) {
            const rowData: any = {};
            $(rowElement).find('td').each((colIndex, cellElement) => {
              const header = headers[colIndex] || `column_${colIndex}`;
              rowData[header] = $(cellElement).text().trim();
            });
            rows.push(rowData);
          }
        } else if (rowIndex > 0 || headers.length === 0) {
          const rowData: any = {};
          $(rowElement).find('td').each((colIndex, cellElement) => {
            const header = headers[colIndex] || `column_${colIndex}`;
            rowData[header] = $(cellElement).text().trim();
          });
          // Only add row if it has data
          if (Object.values(rowData).some(val => (val as string).length > 0)) {
            rows.push(rowData);
          }
        }
      });
      
      if (rows.length > 0) {
        tables.push({
          headers: headers,
          rows: rows
        });
      }
    });
    
    return tables;
  }
}