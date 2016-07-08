#! /usr/bin/env babel-node

import ESMigrate from './ESMigrate'

const esMigrate = new ESMigrate()
esMigrate.run(process.argv.slice(2))
