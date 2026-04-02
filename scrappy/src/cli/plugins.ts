import path from 'path';
import fs from 'fs';
import os from 'os';
import { c, printBox, startSpinner, stopSpinner, sleep } from './ui';

export async function runPlugins(action: string, pluginName?: string) {
  console.log();
  console.log(c.blue('  ╔' + '═'.repeat(60) + '╗'));
  console.log(c.blue('  ║') + c.whiteBold(`  🧩 Scrappy Plugin Manager`) + ' '.repeat(60 - `  🧩 Scrappy Plugin Manager`.length) + c.blue('║'));
  console.log(c.blue('  ╚' + '═'.repeat(60) + '╝'));
  console.log();

  try {
    const pluginDir = path.join(os.homedir(), '.scrappy', 'plugins');
    if (!fs.existsSync(pluginDir)) {
      fs.mkdirSync(pluginDir, { recursive: true });
    }

    if (action === 'add' && pluginName) {
      startSpinner(`Installing plugin: ${pluginName}...`);
      await sleep(1500); // Simulate network fetch

      const pluginTemplate = `
/**
 * Scrappy Plugin: ${pluginName}
 * 
 * Instructions:
 * Export a register() function to make new tools available to ScrappyAgent.
 */
module.exports = {
  name: '${pluginName}',
  register: (agent) => {
    // agent.registerTool(...)
    console.log('[Plugin] ${pluginName} successfully loaded.');
  }
};
`;
      const pluginPath = path.join(pluginDir, `${pluginName}.js`);
      fs.writeFileSync(pluginPath, pluginTemplate.trim(), 'utf-8');

      stopSpinner();
      console.log(c.green('  ✓ ') + c.white(`Plugin ${c.blueBold(pluginName)} installed successfully.`));
      console.log(c.gray(`    Path: ${pluginPath}`));

    } else if (action === 'list') {
      const files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js'));
      if (files.length === 0) {
        console.log(c.yellow('  ℹ No plugins installed.'));
      } else {
        printBox('Installed Plugins', files.map(f => `  • ${f.replace('.js', '')}`));
      }
    } else {
      console.log(c.red(`  ✗ Unknown plugin action: ${action}. Use 'add' or 'list'.`));
    }
    
    console.log();
  } catch (err: any) {
    stopSpinner();
    console.log();
    console.error(c.red(`  ✗ Plugin operation failed: ${err.message}`));
  }
}
