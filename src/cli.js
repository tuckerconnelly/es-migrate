#!/usr/bin/env node_modules/.bin/babel-node --

import ESMigrate from './ESMigrate'

const esMigrate = new ESMigrate()
esMigrate.run(process.argv.slice(2)).catch(console.error)
