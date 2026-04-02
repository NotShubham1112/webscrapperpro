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

const HOME = os.homedir();
const SCRAPPY_OUTPUT = path.join(HOME, '.scrappy', 'output');

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function resolveFolder(folderName: string): string {
  const folderPath = path.join(SCRAPPY_OUTPUT, folderName.trim());
  ensureDir(folderPath);
  return folderPath;
}

function resolveFile(folderPath: string, fileName: string, ext: string): string {
  const base = fileName.trim().replace(/\.[a-z]+$/i, ''); // strip existing ext
  return path.join(folderPath, `${base}.${ext}`);
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
    const folderPath = resolveFolder(folderName);
    console.log(colors.success(`[filegen] Created folder: ${folderPath}`));
    return { success: true, data: { path: folderPath } };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to create output folder.' };
  }
}

// ─── E) create_excel ────────────────────────────────────────────────────────

/**
 * create_excel — Generates a styled .xlsx workbook.
 *
 * Expects `rows` to be an array of plain objects.
 * Column headers are auto-derived from object keys.
 * The sheet is auto-sized, header row is bold + blue,
 * data rows are alternating-light, and a metadata footer is added.
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
    const folderPath = resolveFolder(folderName);
    const filePath = resolveFile(folderPath, fileName, 'xlsx');

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Scrappy — Cosmic CLI Agent';
    wb.created = new Date();

    const ws = wb.addWorksheet('Scrappy Data');

    // ── Derive columns from first row keys ──
    const headers = Object.keys(rows[0]);

    ws.columns = headers.map((h) => ({
      header: h,
      key: h,
      width: Math.max(h.length + 4, 16),
    }));

    // ── Style header row (Cosmic blue) ──
    const headerRow = ws.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' },      // Cosmic bright blue
      };
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 12,
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FF1E40AF' } },
        bottom: { style: 'thin', color: { argb: 'FF1E40AF' } },
        left:   { style: 'thin', color: { argb: 'FF1E40AF' } },
        right:  { style: 'thin', color: { argb: 'FF1E40AF' } },
      };
    });

    // ── Freeze & add data rows ──
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    rows.forEach((rowData, i) => {
      const row = ws.addRow(rowData);
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: i % 2 === 0 ? 'FFFAFAFA' : 'FFEFF6FF' },
        };
        cell.border = {
          top:    { style: 'hair', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'hair', color: { argb: 'FFD1D5DB' } },
          left:   { style: 'hair', color: { argb: 'FFD1D5DB' } },
          right:  { style: 'hair', color: { argb: 'FFD1D5DB' } },
        };
      });
    });

    // ── Footer metadata ──
    const lastRowNum = (ws.lastRow?.number ?? 1) + 2;
    ws.getCell(`A${lastRowNum}`).value =
      `Generated by Scrappy — Cosmic CLI Agent | ${new Date().toLocaleString()}`;
    ws.getCell(`A${lastRowNum}`).font = {
      italic: true,
      color: { argb: 'FF9CA3AF' },
      size: 10,
    };

    await wb.xlsx.writeFile(filePath);
    console.log(colors.success(`[filegen] Excel saved: ${filePath}`));
    return { success: true, data: { path: filePath } };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to create Excel file.' };
  }
}

// ─── F) create_markdown ──────────────────────────────────────────────────────

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
    const folderPath = resolveFolder(folderName);
    const filePath = resolveFile(folderPath, fileName, 'md');

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(colors.success(`[filegen] Markdown saved: ${filePath}`));
    return { success: true, data: { path: filePath } };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to create markdown file.' };
  }
}

// ─── G) create_docx ──────────────────────────────────────────────────────────

/**
 * Minimal markdown-lite parser → docx Paragraphs.
 * Supports:
 *   # Title       → Heading 1, centered
 *   ## Heading    → Heading 2
 *   ### Sub       → Heading 3
 *   - bullet      → bullet list
 *   **bold**      → inline bold runs
 *   blank line    → empty paragraph
 */
function parseDocxContent(text: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();

    if (/^###\s/.test(line)) {
      paragraphs.push(
        new Paragraph({
          text: line.replace(/^###\s/, ''),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (/^##\s/.test(line)) {
      paragraphs.push(
        new Paragraph({
          text: line.replace(/^##\s/, ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (/^#\s/.test(line)) {
      paragraphs.push(
        new Paragraph({
          text: line.replace(/^#\s/, ''),
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 300, after: 200 },
        })
      );
    } else if (/^[-*]\s/.test(line)) {
      paragraphs.push(
        new Paragraph({
          text: line.replace(/^[-*]\s/, ''),
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      );
    } else if (line.trim() === '') {
      paragraphs.push(new Paragraph({ text: '' }));
    } else {
      // Inline **bold**
      const parts = line.split(/\*\*(.+?)\*\*/g);
      const runs: TextRun[] = parts.map((part, i) =>
        new TextRun({ text: part, bold: i % 2 === 1 })
      );
      paragraphs.push(
        new Paragraph({
          children: runs,
          spacing: { after: 120 },
        })
      );
    }
  }

  return paragraphs;
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
    const folderPath = resolveFolder(folderName);
    const filePath = resolveFile(folderPath, fileName, 'docx');

    // Derive a title from filename if content doesn't start with a heading
    const displayTitle = fileName.trim().replace(/\.[a-z]+$/i, '').replace(/[_-]/g, ' ');

    const titleParagraph = new Paragraph({
      children: [new TextRun({ text: displayTitle, bold: true, size: 40 })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
    });

    const metaParagraph = new Paragraph({
      children: [
        new TextRun({
          text: `Generated by Scrappy — Cosmic CLI Agent | ${new Date().toLocaleString()}`,
          italics: true,
          color: '888888',
          size: 18,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    });

    const bodyParagraphs = parseDocxContent(content);

    const doc = new Document({
      creator: 'Scrappy — Cosmic CLI Agent',
      title: displayTitle,
      description: 'Generated by Scrappy CLI',
      sections: [
        {
          properties: {},
          children: [titleParagraph, metaParagraph, ...bodyParagraphs],
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

export default {
  create_output_folder,
  create_excel,
  create_markdown,
  create_docx,
};
