#!/usr/bin/env node --

import 'babel-polyfill'

import ESMigrate from './ESMigrate'

const esMigrate = new ESMigrate()
esMigrate.run(process.argv.slice(2)).catch(console.error)
