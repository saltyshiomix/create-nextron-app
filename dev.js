#!/usr/bin/env node

const args = require('arg')({});

require('execa').sync('node', ['index.js', 'workspace', '--example', args._[0] || 'with-javascript'], { stdio: 'inherit' });
