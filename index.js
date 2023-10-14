#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const arg = require('arg');
const chalk = require('chalk');

const cwd = process.cwd();

const args = arg({
  '--help': Boolean,
  '--version': Boolean,
  '--example': String,
  '-h': '--help',
  '-v': '--version',
  '-e': '--example',
});

if (args['--version']) {
  const pkg = require(path.join(__dirname, 'package.json'));
  console.log(`create-nextron-app v${pkg.version}`);
  process.exit(0);
}

if (args['--help'] || (!args._[0])) {
  console.log(chalk`
    {bold.cyan create-nextron-app} - Create Nextron (Electron + Next.js) apps in one command ⚡

    {bold USAGE}

      {bold $} {cyan create-nextron-app} --help
      {bold $} {cyan create-nextron-app} {underline my-app}
      {bold $} {cyan create-nextron-app} {underline my-app} [--example {underline example_folder_name}]

    {bold OPTIONS}

      --help,     -h                      shows this help message
      --version,  -v                      displays the current version of create-nextron-app
      --example,  -e {underline example_folder_name}  sets the example as a template
  `);
  process.exit(0);
}

createNextronApp();

async function createNextronApp() {
  const spinner = require('./spinner');
  const example = args['--example'] || 'basic-lang-javascript';

  try {
    spinner.create('Validating existence...');
    await validateExistence(example);
  } catch (error) {
    console.error(error);
    spinner.fail(`Not found: ${example}`);
  }

  try {
    spinner.create('Downloading and extracting...');
    const dirname = path.join(cwd, args._[0]);
    await require('make-dir')(dirname);
    await downloadAndExtract(example, dirname, spinner);
  } catch (error) {
    console.error(error);
    spinner.fail(error);
  }
}

async function validateExistence(example) {
  const { Octokit } = require('@octokit/rest');
  await new Octokit().repos.getContent({
    owner: 'saltyshiomix',
    repo: 'nextron',
    ref: 'main',
    path: `examples/${example}/package.json`,
  });
}

async function downloadAndExtract(example, dirname, spinner) {
  const mainUrl = 'https://codeload.github.com/saltyshiomix/nextron/tar.gz/main';
  const got = require('got');
  const { t, x } = require('tar');

  let ext = 'js';
  await got
    .stream(mainUrl)
    .pipe(t({ cwd: dirname, strip: 3, filter: (path) => {
      if (path.endsWith(`${example}/tsconfig.json`)) {
        ext = 'ts';
      }
      return false;
    }}))
    .on('finish', async () => {
      try {
        await Promise.all([
          new Promise(resolve => {
            got
              .stream(mainUrl)
              .pipe(x({ cwd: dirname, strip: 3 }, [`nextron-main/examples/_template/gitignore.txt`]))
              .on('finish', () => {
                fs.renameSync(path.join(dirname, 'gitignore.txt'), path.join(dirname, '.gitignore'));
                resolve();
              });
          }),
          new Promise(resolve => {
            got
              .stream(mainUrl)
              .pipe(x({ cwd: dirname, strip: 4 }, [`nextron-main/examples/_template/${ext}`]))
              .on('finish', () => resolve());
          }),
        ]);

        await new Promise(resolve => {
          got
            .stream(mainUrl)
            .pipe(x({ cwd: dirname, strip: 3 }, [`nextron-main/examples/${example}`]))
            .on('finish', () => resolve());
        });

        const cmd = (await pm() === 'yarn') ? 'yarn && yarn dev' : 'npm install && npm run dev';
        spinner.clear(`Run \`${cmd}\` inside of "${dirname}" to start the app`);
      } catch (error) {
        spinner.fail('Unknown error occurred.');
      }
    });
}

async function pm() {
  const { promisify } = require('util');
  const { exec: defaultExec } = require('child_process');

  let pm = 'yarn';
  const exec = promisify(defaultExec);
  try {
    await exec(`${pm} -v`, { cwd });
  } catch (_) {
    pm = 'npm';
    try {
      await exec(`${pm} -v`, { cwd });
    } catch (_) {
      pm = undefined;
    }
  }

  if (pm === undefined) {
    console.log(chalk.red('No available package manager! (`npm` or `yarn` is required)'));
    process.exit(1);
  }

  return pm;
}
