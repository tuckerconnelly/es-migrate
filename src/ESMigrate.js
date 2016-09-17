/* eslint-disable max-len */

const path = require('path')
const fs = require('fs')

const minimist = require('minimist')

function zeroPad(number, length) {
  const stringNumber = '' + number
  if (stringNumber.length === length) return number
  return zeroPad(`0${number}`, length)
}

function tsFromVersion(version) {
  const year = version.substr(0, 4)
  const month = version.substr(4, 2)
  const date = version.substr(6, 2)
  const hours = version.substr(8, 2)
  const minutes = version.substr(10, 2)
  const seconds = version.substr(12, 2)

  return Date.UTC(year, month, date, hours, minutes, seconds)
}

function migrationDir(fileName = '') {
  return path.resolve(process.cwd(), 'migrations', fileName)
}

export default class ESMigrate {
  static VALID_COMMANDS = ['create', 'sync', 'version']

  async run(argv) {
    const input = Array.isArray(argv) ? minimist(argv) : minimist(argv.split(' ').slice(1))

    if (input._.length === 0) {
      console.log(`
Usage:
  $ es-migrate [create|sync|version] [name|version]

\`create\` will make a new migration. \`sync\` will sync to the specified version (if none is given, latest). \`version\` will get the current version.

\`es-migrate version -p\` will get the previous version
`)
      return
    }

    if (ESMigrate.VALID_COMMANDS.indexOf(input._[0]) === -1) {
      console.error(`Command ${input._[0]} not recognized. Use create, sync, or version.`)
      return
    }

    try {
      this.strategy = require(migrationDir('index.js'))
    } catch (err) {
      console.error('Couldn\'t read your setup file at migrations/index.js')
      return
    }

    await this.strategy.init()
    await this[input._[0]](input)
    await this.strategy.end()
  }

  get _migrationFiles() {
    return fs.readdirSync(migrationDir())
      .filter(fileName => /^\d{14}\-\S+\.js$/.test(fileName))
  }

  async create(input) {
    if (!input._[1]) {
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
      `-${input._[1]}.js`

    fs.writeFileSync(
      migrationDir(fileName),
      this.strategy.template
    )

    console.log(`Created migrations/${fileName}`)
  }

  async sync(input) {
    await this._up(input)
    await this._down(input)
  }

  _up(input) {
    const targetVersion = input._[2]
    const tsFromTargetVersion = targetVersion && tsFromVersion(targetVersion)

    return this._migrationFiles
      .map(async migrationFile => {
        const migration = require(migrationDir(migrationFile))
        migration.version = migrationFile.split('.')[0]

        if (targetVersion && tsFromVersion(migration.version) > tsFromTargetVersion) return
        if (await this.strategy.hasRan(migration)) return

        console.log(`Running ${migration.version}`)
        await this.strategy.up(migration)
      })
      .reduce((prev, curr) => prev.then(curr), Promise.resolve())
  }

  _down(input) {
    if (!input._[2]) return

    const targetVersion = input._[2]
    const tsFromTargetVersion = targetVersion && tsFromVersion(targetVersion)

    let migration
    return Promise.all(this._migrationFiles.reverse().map(async migrationFile => {
      migration = require(migrationDir(migrationFile))
      migration.version = migrationFile.split('.')[0]

      if (targetVersion && tsFromVersion(migration.version) <= tsFromTargetVersion) return
      if (! await this.strategy.hasRan(migration)) return

      console.log(`Rolling back ${migration.version}`)
      await this.strategy.down(migration)
    }))
  }

  async version() {
    let i = this._migrationFiles.length - 1
    if (i === -1) return console.error('Couldn\'t get version: no migrations exist yet')

    const toSubtract = process.argv[3] && parseInt(process.argv[3].substr(1))
    if (toSubtract && i - toSubtract < 0) return console.error(`Couldn\'t get version: there are only ${this._migrationFiles.length} migrations`)

    if (toSubtract) i -= toSubtract

    console.log(this._migrationFiles[i].split('.')[0])
  }
}
