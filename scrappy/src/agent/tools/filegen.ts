/**
 * Scrappy - File Generation Tools
 * Company: Cosmic
 *
 * Generates Excel (.xlsx), Markdown (.md), and Word (.docx) files
 * in a user-specified output folder under ~/.scrappy/output/.
 *
 * Uses: exceljs, docx, fs/path
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import ExcelJS from 'exceljs';
import {
  Document, Paragraph, TextRun, HeadingLevel,
  AlignmentType, Packer,
} from 'docx';
import { colors } from '../../utils/colors';

// ─── Path helpers ────────────────────────────────────────────────────────────

function ensureDir(dirPath: string): void {
  if (!dirPath) return;
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/** 
 * Resolves a path relative to the provided base or Default output.
 */
function resolvePath(userPath: string, fileName: string, ext?: string): string {
  const targetExt = ext ? `.${ext.replace(/^\./, '')}` : '';
  const finalName = fileName.endsWith(targetExt) ? fileName : `${fileName}${targetExt}`;
  
  if (path.isAbsolute(userPath)) {
    return path.join(userPath, finalName);
  }
  
  return path.join(process.cwd(), userPath, finalName);
}

// ─── E) create_output_folder ─────────────────────────────────────────────────

/**
 * create_output_folder — Creates a named folder under ~/.scrappy/output/.
 */
export async function create_output_folder(args: {
  folderName: string;
}): Promise<{
  success: boolean;
  data?: { path: string };
  error?: string;
}> {
  const { folderName } = args;

  if (!folderName || typeof folderName !== 'string' || folderName.trim().length === 0) {
    return { success: false, error: 'folderName is required and must be a non-empty string.' };
  }

  try {
    const folderPath = path.isAbsolute(folderName) ? folderName : path.join(process.cwd(), folderName);
    ensureDir(folderPath);
    return { success: true, data: { path: folderPath } };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to create output folder.' };
  }
}

// ─── F) create_excel ────────────────────────────────────────────────────────

/**
 * create_excel — Generates a styled .xlsx workbook.
 */
export async function create_excel(args: {
  folderName: string;
  fileName: string;
  rows: Record<string, any>[];
}): Promise<{
  success: boolean;
  data?: { path: string };
  error?: string;
}> {
  const { folderName, fileName, rows } = args;

  if (!folderName || folderName.trim().length === 0) {
    return { success: false, error: 'folderName is required.' };
  }
  if (!fileName || fileName.trim().length === 0) {
    return { success: false, error: 'fileName is required.' };
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return { success: false, error: 'rows must be a non-empty array of objects.' };
  }

  try {
    const filePath = resolvePath(folderName, fileName, 'xlsx');
    ensureDir(path.dirname(filePath));

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Scrappy — Cosmic CLI Agent';
    wb.created = new Date();

    const ws = wb.addWorksheet('Scrappy Data');

    // ── Derive columns ──
    const headers = Object.keys(rows[0]);

    // Calculate dynamic widths
    const colWidths = headers.map(h => {
      let maxLen = h.length;
      rows.forEach(row => {
        const val = String(row[h] || '');
        if (val.length > maxLen) maxLen = val.length;
      });
      return Math.min(Math.max(maxLen + 4, 12), 50);
    });

    ws.columns = headers.map((h, i) => ({
      header: h,
      key: h,
      width: colWidths[i],
    }));

    // ── Style header row ──
    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' },
      };
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 13,
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };
      cell.border = {
        top:    { style: 'medium', color: { argb: 'FF1E40AF' } },
        bottom: { style: 'medium', color: { argb: 'FF1E40AF' } },
        left:   { style: 'medium', color: { argb: 'FF1E40AF' } },
        right:  { style: 'medium', color: { argb: 'FF1E40AF' } },
      };
    });

    // ── Add and format data rows ──
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    rows.forEach((rowData, i) => {
      const row = ws.addRow(rowData);
      row.height = 20;

      row.eachCell((cell, colNum) => {
        const val = cell.value;

        // Style
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: i % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF' },
        };
        
        cell.border = {
          top:    { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left:   { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right:  { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };

        // Automatic alignment & type conversion
        if (typeof val === 'string') {
          // Clean currency/numeric strings
          const cleanVal = val.replace(/[$,\s]/g, '');
          if (cleanVal !== '' && !isNaN(Number(cleanVal))) {
            cell.value = Number(cleanVal);
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            if (val.includes('$')) {
              cell.numFmt = '"$"#,##0.00';
            }
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        } else if (typeof val === 'number') {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    });

    // ── Footer ──
    const lastRowNum = (ws.lastRow?.number ?? 1) + 2;
    ws.mergeCells(`A${lastRowNum}:${String.fromCharCode(65 + headers.length - 1)}${lastRowNum}`);
    const footerCell = ws.getCell(`A${lastRowNum}`);
    footerCell.value = `Generated by Scrappy — Cosmic CLI Agent | ${new Date().toLocaleString()}`;
    footerCell.font = { italic: true, color: { argb: 'FF6B7280' }, size: 10 };
    footerCell.alignment = { horizontal: 'center' };

    await wb.xlsx.writeFile(filePath);
    console.log(colors.success(`[filegen] Excel saved: ${filePath}`));
    return { success: true, data: { path: filePath } };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to create Excel file.' };
  }
}

// ─── G) create_markdown ──────────────────────────────────────────────────────

/**
 * create_markdown — Writes a markdown file (README.md or any .md).
 */
export async function create_markdown(args: {
  folderName: string;
  fileName: string;
  content: string;
}): Promise<{
  success: boolean;
  data?: { path: string };
  error?: string;
}> {
  const { folderName, fileName, content } = args;

  if (!folderName || folderName.trim().length === 0) {
    return { success: false, error: 'folderName is required.' };
  }
  if (!fileName || fileName.trim().length === 0) {
    return { success: false, error: 'fileName is required.' };
  }
  if (typeof content !== 'string') {
    return { success: false, error: 'content must be a string.' };
  }

  try {
    const filePath = resolvePath(folderName, fileName, 'md');
    ensureDir(path.dirname(filePath));

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(colors.success(`[filegen] Markdown saved: ${filePath}`));
    return { success: true, data: { path: filePath } };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to create markdown file.' };
  }
}

// ─── H) create_docx ──────────────────────────────────────────────────────────

/**
 * Advanced Word Paragraph generator.
 */
function parseDocxContent(text: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();

    // 1. Headings
    if (/^#\s/.test(line)) {
      paragraphs.push(new Paragraph({
        text: line.replace(/^#\s/, ''),
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 },
      }));
      continue;
    }
    if (/^##\s/.test(line)) {
      paragraphs.push(new Paragraph({
        text: line.replace(/^##\s/, ''),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      }));
      continue;
    }
    if (/^###\s/.test(line)) {
      paragraphs.push(new Paragraph({
        text: line.replace(/^###\s/, ''),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }));
      continue;
    }

    // 2. Lists
    if (/^[-*+]\s/.test(line)) {
      const content = line.replace(/^[-*+]\s/, '');
      paragraphs.push(new Paragraph({
        children: parseInlineFormatting(content),
        bullet: { level: 0 },
        spacing: { after: 100 },
      }));
      continue;
    }

    // 3. Spacing
    if (line.trim() === '') {
      paragraphs.push(new Paragraph({ text: '' }));
      continue;
    }

    // 4. Default Text with inline formatting
    paragraphs.push(new Paragraph({
      children: parseInlineFormatting(line),
      spacing: { after: 120 },
    }));
  }

  return paragraphs;
}

/**
 * Robust inline formatting parser for DOCX.
 * Handles: **bold**, __bold__, *italic*, _italic_, ***bold-italic***
 */
function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  
  // Clean up stray symbols commonly found in LLM output
  let processed = text.replace(/\\([*#_])/g, '$1'); 

  // Combined styles bold-italic
  const pattern = /(\*\*\*|__{3}|___)(.*?)\1|(\*\*|__)(.*?)\3|(\*|_)(.*?)\5/g;
  
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(processed)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: processed.substring(lastIndex, match.index) }));
    }

    const boldItalic = match[2];
    const bold = match[4];
    const italic = match[6];

    if (boldItalic) {
      runs.push(new TextRun({ text: boldItalic, bold: true, italics: true }));
    } else if (bold) {
      runs.push(new TextRun({ text: bold, bold: true }));
    } else if (italic) {
      runs.push(new TextRun({ text: italic, italics: true }));
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < processed.length) {
    runs.push(new TextRun({ text: processed.substring(lastIndex) }));
  }

  if (runs.length === 0 && processed.length > 0) {
    runs.push(new TextRun({ text: processed.replace(/[*_]/g, '') }));
  }

  return runs;
}

/**
 * create_docx — Generates a styled .docx Word document.
 */
export async function create_docx(args: {
  folderName: string;
  fileName: string;
  content: string;
}): Promise<{
  success: boolean;
  data?: { path: string };
  error?: string;
}> {
  const { folderName, fileName, content } = args;

  if (!folderName || folderName.trim().length === 0) {
    return { success: false, error: 'folderName is required.' };
  }
  if (!fileName || fileName.trim().length === 0) {
    return { success: false, error: 'fileName is required.' };
  }
  if (typeof content !== 'string') {
    return { success: false, error: 'content must be a string.' };
  }

  try {
    const filePath = resolvePath(folderName, fileName, 'docx');
    ensureDir(path.dirname(filePath));

    const displayTitle = fileName.trim().replace(/\.[a-z]+$/i, '').replace(/[_-]/g, ' ').toUpperCase();

    const bodyParagraphs = parseDocxContent(content);

    const doc = new Document({
      creator: 'Scrappy — Cosmic CLI Agent',
      title: displayTitle,
      description: 'Generated by Scrappy CLI',
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children: [
            new Paragraph({
              children: [new TextRun({ text: displayTitle, bold: true, size: 48, color: '2563EB' })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 400, after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Generated: ${new Date().toLocaleString()}`,
                  italics: true,
                  color: '6B7280',
                  size: 18,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 800 },
            }),
            ...bodyParagraphs,
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);

    console.log(colors.success(`[filegen] Word document saved: ${filePath}`));
    return { success: true, data: { path: filePath } };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to create Word document.' };
  }
}

export const filegen = {
  create_output_folder,
  create_excel,
  create_markdown,
  create_docx,
};

export default filegen;
