#!/usr/bin/env node --harmony

const ESMigrate = require('./ESMigrate')

const esMigrate = new ESMigrate()
esMigrate.run(process.argv.slice(2)).catch(console.error)
