import path from 'path';
import fs from 'fs';
import { c, printBox, startSpinner, stopSpinner, startResponse, endResponse, printResponseLine, getLayoutWidth } from './ui';
import { getLLM } from '../agent/llm';

export async function runReadme(targetPath: string) {
  startResponse(true);
  printResponseLine(c.whiteBold(`📝 Scrappy README Generator`));
  printResponseLine(c.gray('Analyzing project structure and generating documentation...'));
  printResponseLine('─'.repeat(50));

  try {
    const fullPath = path.resolve(process.cwd(), targetPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Directory not found: ${fullPath}`);
    }

    startSpinner('Analyzing project structure...');

    // Basic tree structure extraction
    const getStructure = (dir: string, depth = 0, maxDepth = 3): string => {
      if (depth > maxDepth) return '';
      let result = '';
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules' || item === 'dist' || item === 'build') continue;
        const itemPath = path.join(dir, item);
        const isDir = fs.statSync(itemPath).isDirectory();
        result += '  '.repeat(depth) + (isDir ? `📁 ${item}/\n` : `📄 ${item}\n`);
        if (isDir) {
          result += getStructure(itemPath, depth + 1, maxDepth);
        }
      }
      return result;
    };

    const structure = getStructure(fullPath);

    // Read package.json if exists for metadata
    let metadata = '';
    const pkgPath = path.join(fullPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      metadata = `Name: ${pkg.name}\nDescription: ${pkg.description || 'N/A'}\nDependencies: ${Object.keys(pkg.dependencies || {}).join(', ')}\nDevDependencies: ${Object.keys(pkg.devDependencies || {}).join(', ')}`;
    }

    stopSpinner();
    startSpinner('Generating beautiful README with LLM...');

    const prompt = `You are an expert developer and open-source maintainer. Write a top-tier, beautiful, and comprehensive README.md for the following project.
Project Structure:
${structure}

Additional Metadata (if any):
${metadata}

The README should include:
1. A clean, beautiful header with an ASCII logo or emojis.
2. Short, punchy description.
3. Key Features.
4. Quickstart / Installation instructions.
5. Tech Stack / Project Structure.
6. License section (default MIT).
Make it feel viral, well-documented, and professional. Output ONLY the raw markdown content. No conversational fluff or wrapping markdown blocks like "\`\`\`markdown" unless it's code inside the README.`;

    const llm = getLLM();
    let readmeContent = await llm.complete(prompt);

    // Remove wrapping markdown block if the LLM adds it
    if (readmeContent.startsWith('\`\`\`markdown')) {
      readmeContent = readmeContent.replace(/^\`\`\`markdown/, '').replace(/\`\`\`$/, '').trim();
    } else if (readmeContent.startsWith('\`\`\`')) {
      readmeContent = readmeContent.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    stopSpinner();

    const outPath = path.join(fullPath, 'README.md');
    let overwrite = false;
    if (fs.existsSync(outPath)) {
       const backupPath = path.join(fullPath, 'README-Scrappy.md');
       fs.writeFileSync(backupPath, readmeContent, 'utf-8');
       printResponseLine(c.green('  ✓ ') + c.white(`Generated README: `) + c.gray(backupPath));
    } else {
       fs.writeFileSync(outPath, readmeContent, 'utf-8');
       printResponseLine(c.green('  ✓ ') + c.white(`Generated README: `) + c.gray(outPath));
    }
    
    endResponse();
  } catch (err: any) {
    stopSpinner();
    console.log();
    console.error(c.red(`  ✗ README generation failed: ${err.message}`));
  }
}
