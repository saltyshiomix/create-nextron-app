#!/usr/bin/env node

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
  const example = args['--example'] || 'with-javascript';

  try {
    spinner.create('Validating existence...');
    await validatesExistence(example);
  } catch (error) {
    spinner.fail(`Not found: ${example}`);
  }

  try {
    spinner.create('Downloading and extracting...');
    const name = path.join(cwd, args._[0]);
    await require('make-dir')(name);
    await extract(name, example);

    const cmd = (await pm() === 'yarn') ? 'yarn && yarn dev' : 'npm install && npm run dev';
    spinner.clear(`Run \`${cmd}\` inside of "${name}" to start the app`);
  } catch (error) {
    spinner.fail(error);
  }
}

async function validatesExistence(example) {
  const Github = require('@octokit/rest');
  await new Github().repos.getContents({
    owner: 'saltyshiomix',
    repo: 'nextron',
    path: `examples/${example}/package.json`,
  });
}

async function extract(name, example) {
  const masterUrl = 'https://codeload.github.com/saltyshiomix/nextron/tar.gz/master';
  const got = require('got');
  const { t, x } = require('tar');

  let ext = 'js';
  await got
    .stream(masterUrl)
    .pipe(t({ cwd: name, strip: 3, filter: (path) => {
      if (path.endsWith(`${example}/tsconfig.json`)) {
        ext = 'ts';
      }
      return false;
    }}))
    .on('finish', async () => {
      await got
        .stream(masterUrl)
        .pipe(x({ cwd: name, strip: 4 }, [`nextron-master/examples/_template/${ext}`]));

      await got
        .stream(masterUrl)
        .pipe(x({ cwd: name, strip: 3 }, [`nextron-master/examples/${example}`]));
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
      pm = null;
    }
  }

  if (pm === null) {
    console.log(chalk.red('No available package manager! (`npm` or `yarn` is required)'));
    process.exit(1);
  }

  return pm;
}
