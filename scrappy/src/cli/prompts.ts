import inquirer from 'inquirer';

/**
 * Prompt user for scraping configuration
 */
export async function scrappyPrompt() {
  const questions = [
    {
      type: 'input',
      name: 'url',
      message: 'Enter the URL to scrape:',
      validate: (input: string) => {
        if (!input) return 'URL is required';
        const urlPattern = new RegExp(
          '^(https?:\\/\\/)?' + // protocol
          '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
          '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
          '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
          '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
          '(\\#[-a-z\\d_]*)?$', // fragment locator
          'i'
        );
        return !!urlPattern.test(input) || 'Please enter a valid URL';
      }
    },
    {
      type: 'list',
      name: 'model',
      message: 'Select the AI model to use:',
      choices: [
        { name: 'Ollama (Local)', value: 'ollama' },
        { name: 'OpenRouter', value: 'openrouter' },
        { name: 'Groq', value: 'groq' },
        { name: 'Mistral', value: 'mistral' }
      ],
      default: 'ollama'
    },
    {
      type: 'password',
      name: 'apiKey',
      message: 'Enter API key (if required for selected model):',
      when: (answers: any) => answers.model !== 'ollama',
      validate: (input: string, answers: any) => {
        if (!input && ['openrouter', 'groq', 'mistral'].includes(answers.model)) {
          return 'API key is required for this model';
        }
        return true;
      }
    }
  ];

  const answers = await inquirer.prompt(questions);
  return answers;
}