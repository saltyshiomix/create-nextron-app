#!/usr/bin/env node

const execa = require('execa')

const args = require('arg')({})

execa.sync('node', ['index.js', 'workspace', '--example', args._[0] || 'with-javascript'], { stdio: 'inherit' })
