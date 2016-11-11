// NOTE Cross-platform node cli with --harmony flag
// The cli file was copied from https://github.com/olov/node-harmony-wrapper

const ESMigrate = require('./ESMigrate')

const esMigrate = new ESMigrate()
esMigrate.run(process.argv.slice(2)).catch(console.error)
