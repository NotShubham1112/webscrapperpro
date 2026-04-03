import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { c, printSuccess, printError, printInfo, printDivider, getLayoutWidth } from './ui';
import { WORKFLOW_PROSE } from './workflowContent';

/**
 * Cosmic Scrappy - General Purpose File Generation Workflow
 * Generates Word, Excel, PDF, JSON, and Metadata files.
 */

export async function runWorkflow(): Promise<void> {
  console.log();
  console.log(c.blueBold('  🚀 Starting Cosmic Scrappy Workflow Generation'));
  console.log(c.blue('  ' + '─'.repeat(50)));

  // 1. Permission Prompt
  const { confirm } = await inquirer.prompt([
    {
      type: 'list',
      name: 'confirm',
      message: 'Do you want me to generate the output folder and all requested files in the current working directory?',
      choices: ['Yes', 'No'],
      default: 'No'
    }
  ]);

  if (confirm === 'No') {
    console.log(c.red('  Operation cancelled by user. Terminating process.'));
    process.exit(0);
  }

  const outputFolderName = 'CosmicScrappy_Output';
  const outputDirPath = path.join(process.cwd(), outputFolderName);

  try {
    // 2. Create directory
    if (!fs.existsSync(outputDirPath)) {
      fs.mkdirSync(outputDirPath, { recursive: true });
    }

    console.log(c.gray('  Creating folder: ') + c.white(outputDirPath));
    console.log();

    const createdFiles: string[] = [];

    // 3. Generate Word Document
    const wordFile = path.join(outputDirPath, 'CosmicScrappy_Overview.docx');
    await generateWordDoc(wordFile);
    createdFiles.push('CosmicScrappy_Overview.docx');
    printSuccess('Generated Word document');

    // 4. Generate Excel Workbook
    const excelFile = path.join(outputDirPath, 'CosmicScrappy_Data.xlsx');
    await generateExcel(excelFile);
    createdFiles.push('CosmicScrappy_Data.xlsx');
    printSuccess('Generated Excel workbook');

    // 5. Generate PDF File
    const pdfFile = path.join(outputDirPath, 'CosmicScrappy_Report.pdf');
    await generatePDF(pdfFile);
    createdFiles.push('CosmicScrappy_Report.pdf');
    printSuccess('Generated PDF file');

    // 6. Generate JSON File
    const jsonFile = path.join(outputDirPath, 'CosmicScrappy_Config.json');
    generateJSON(jsonFile);
    createdFiles.push('CosmicScrappy_Config.json');
    printSuccess('Generated JSON configuration');

    // 7. Generate Metadata File
    const metaFile = path.join(outputDirPath, 'metadata.txt');
    generateMetadata(metaFile, confirm, createdFiles, outputDirPath);
    createdFiles.push('metadata.txt');
    printSuccess('Generated Metadata text file');

    // 8. Final Summary
    console.log();
    printDivider('═');
    console.log(c.green.bold('  ✅ SUCCESS: WORKFLOW GENERATION COMPLETE'));
    printDivider('═');
    console.log(c.white('  Folder Created : ') + c.blueBold(outputFolderName));
    console.log(c.white('  Full Path      : ') + c.lightBlue.underline(outputDirPath));
    console.log(c.white('  Files Created  : '));
    createdFiles.forEach(f => console.log(c.gray('    - ') + c.white(f)));
    printDivider('═');
    console.log();

  } catch (error: any) {
    console.log();
    printError('An error occurred during file generation: ' + error.message);
    process.exit(1);
  }
}

/**
 * Word Generator
 */
async function generateWordDoc(filePath: string): Promise<void> {
  const doc = new Document({
    creator: 'Cosmic Scrappy',
    title: WORKFLOW_PROSE.word.title,
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: WORKFLOW_PROSE.word.title, bold: true, size: 36 })],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        ...WORKFLOW_PROSE.word.sections.flatMap(section => [
          new Paragraph({
            children: [new TextRun({ text: section.heading, bold: true, size: 28 })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            children: [new TextRun({ text: section.content })],
            spacing: { after: 200 }
          })
        ])
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);
}

/**
 * Excel Generator
 */
async function generateExcel(filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  
  // Sheet 1
  const ws1 = workbook.addWorksheet(WORKFLOW_PROSE.excel.sheet1.name);
  ws1.columns = WORKFLOW_PROSE.excel.sheet1.columns.map(col => ({ header: col, key: col, width: 25 }));
  WORKFLOW_PROSE.excel.sheet1.data.forEach(row => ws1.addRow(row));
  ws1.getRow(1).font = { bold: true };

  // Sheet 2
  const ws2 = workbook.addWorksheet(WORKFLOW_PROSE.excel.sheet2.name);
  ws2.columns = WORKFLOW_PROSE.excel.sheet2.columns.map(col => ({ header: col, key: col, width: 25 }));
  WORKFLOW_PROSE.excel.sheet2.data.forEach(row => ws2.addRow(row));
  ws2.getRow(1).font = { bold: true };

  // Sheet 3
  const ws3 = workbook.addWorksheet(WORKFLOW_PROSE.excel.sheet3.name);
  ws3.columns = WORKFLOW_PROSE.excel.sheet3.columns.map(col => ({ header: col, key: col, width: 25 }));
  WORKFLOW_PROSE.excel.sheet3.data.forEach(row => ws3.addRow(row));
  ws3.getRow(1).font = { bold: true };

  await workbook.xlsx.writeFile(filePath);
}

/**
 * PDF Generator
 */
async function generatePDF(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Title
    doc.fontSize(24).font('Helvetica-Bold').text(WORKFLOW_PROSE.word.title, { align: 'center' });
    doc.moveDown(2);

    // Sections
    WORKFLOW_PROSE.word.sections.forEach(section => {
      doc.fontSize(16).font('Helvetica-Bold').text(section.heading);
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(section.content);
      doc.moveDown(1.5);

      // Check if we need a new page
      if (doc.y > 700) doc.addPage();
    });

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

/**
 * JSON Generator
 */
function generateJSON(filePath: string): void {
  const content = JSON.stringify(WORKFLOW_PROSE.json, null, 2);
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Metadata Generator
 */
function generateMetadata(filePath: string, permission: string, files: string[], dir: string): void {
  const timestamp = new Date().toLocaleString();
  const content = 
`SCRAPPY WORKFLOW METADATA
Generated: ${timestamp}
----------------------------------------
Permission Response: ${permission}
Output Directory: ${dir}
Status: Successful
----------------------------------------
Created Files:
${files.map(f => `- ${f}`).join('\n')}
----------------------------------------
Runtime Notes:
- All files generated using Cosmic Scrappy automated workflow.
- Formatting strictly follows plain text guidelines.
- No asterisks or markdown symbols used in content.
`;

  fs.writeFileSync(filePath, content, 'utf-8');
}
