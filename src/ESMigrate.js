const path = require('path')
const fs = require('fs')

const minimist = require('minimist')

function zeroPad(number, length) {
  const stringNumber = '' + number
  if (stringNumber.length === length) return number
  return zeroPad(`0${number}`, length)
}

function migrationDir(fileName = '') {
  return path.resolve(process.cwd(), 'migrations', fileName)
}

export default class ESMigrate {
  static VALID_COMMANDS = ['up', 'down', 'create']

  async run(argv) {
    const input = Array.isArray(argv) ? minimist(argv) : minimist(argv.split(' '))

    if (ESMigrate.VALID_COMMANDS.indexOf(input._[1]) === -1) {
      console.error('Command not recognized. run `es-migrate --help` to see available commands`')
      return
    }

    try {
      this.strategy = require(migrationDir('index.js'))
    } catch (err) {
      console.error('Couldn\'t read your setup file at migrations/index.js')
      return
    }

    await this[input._[1]](input)
  }

  async create(input) {
    if (!input._[2]) {
      console.error('You need to specify a name for the migration')
      return
    }

    const date = new Date()

    const fileName = '' +
      date.getUTCFullYear() +
      zeroPad((date.getUTCMonth() + 1), 2) +
      zeroPad(date.getUTCDate(), 2) +
      zeroPad(date.getUTCHours(), 2) +
      zeroPad(date.getUTCMinutes(), 2) +
      zeroPad(date.getUTCSeconds(), 2) +
      `-${input._[2]}.js`

    fs.writeFileSync(
      migrationDir(fileName),
      this.strategy.template
    )
  }

  async up() {
    const migrationFiles = fs.readdirSync(migrationDir())
    migrationFiles.splice(migrationFiles.indexOf('index.js'), 1)

    await this.strategy.init()

    await migrationFiles.forEach(async migrationFile => {
      const migration = require(migrationDir(migrationFile))
      migration.id = migrationFile.split('.')[0]

      if (await this.strategy.hasRan(migration)) return
      await this.strategy.up(migration)
    })
  }

  async down(input) {
    const migrationFiles = fs.readdirSync(migrationDir())
    migrationFiles.splice(migrationFiles.indexOf('index.js'), 1)

    const count = input._[2] ? parseInt(input._[2]) : 1

    let migration
    await migrationFiles.reverse().slice(0, count).forEach(async migrationFile => {
      migration = require(migrationDir(migrationFile))
      migration.id = migrationFile.split('.')[0]

      if (! await this.strategy.hasRan(migration)) return
      console.log(`Rolling back ${migrationFile}`)
      await this.strategy.down(migration)
    })
  }
}
