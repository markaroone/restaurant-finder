import { exec } from 'child_process';
import ora from 'ora';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function runTasks() {
  const isFixMode = process.argv.includes('--fix');

  const tasks = isFixMode
    ? [
        { name: 'Formatting code with Prettier...', cmd: 'pnpm format' },
        { name: 'Auto-fixing ESLint issues...', cmd: 'pnpm lint:fix' },
      ]
    : [
        { name: 'Checking formatting...', cmd: 'pnpm format:check' },
        { name: 'Running ESLint...', cmd: 'pnpm lint' },
        { name: 'Typechecking with TypeScript...', cmd: 'pnpm typecheck' },
      ];

  console.log(`\nStarting ${isFixMode ? 'Fix' : 'Check'} Pipeline...\n`);

  let hasErrors = false;
  const errorLogs = [];

  for (const task of tasks) {
    const spinner = ora(task.name).start();
    try {
      await execPromise(task.cmd);
      spinner.succeed(`${task.name} Done!`);
    } catch (error) {
      spinner.fail(`${task.name} Failed.`);
      hasErrors = true;

      const combinedLog = [error.stdout, error.stderr]
        .filter(Boolean)
        .join('\n')
        .trim();

      errorLogs.push({
        task: task.name,
        log: combinedLog || error.message,
      });
    }
  }

  if (hasErrors) {
    console.log('\n--- 🚨 Error Details ---\n');
    errorLogs.forEach(({ task, log }) => {
      console.log(`❌ ${task}`);
      console.log(`${log}\n`);
    });
    console.log('⚠️ Pipeline failed. Please fix the issues listed above.\n');
    process.exit(1);
  } else {
    console.log('\n✨ All tasks completed successfully!\n');
  }
}

runTasks();
