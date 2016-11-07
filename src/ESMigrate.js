/* eslint-disable max-len */

const path = require('path')
const fs = require('fs')
const trim = require('lodash').trim

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

module.exports = class ESMigrate {
  static get LOCK_FILENAME() { return 'es-migrate.lock' }
  static get VALID_COMMANDS() { return ['create', 'sync', 'version', 'set'] }

  async run(argv) {
    const input = Array.isArray(argv) ? minimist(argv) : minimist(argv.split(' ').slice(1))

    if (input._.length === 0) {
      console.log(`
Usage:
  $ es-migrate [create|sync|version|set] [name|version] [-d]

\`create [name]\` will make a new migration and set the version in the config file
\`sync\` will sync to the version in the config file
\`sync -d\` will do a dry run of the sync, running the migration but not adding it to the migrations table (useful for testing)
\`version\` will get the current version
\`version -1\` will get the previous version (-2 will get 2 versions ago, etc.)
\`set [version]\` will set the version in the config file to the specified version
`)
      return
    }

    if (ESMigrate.VALID_COMMANDS.indexOf(input._[0]) === -1) {
      console.error(`Command ${input._[0]} not recognized. Use create, sync, or version.`)
      return
    }

    try {
      this.strategy = require(path.resolve(process.cwd(), 'es-migrate.config.js'))
    } catch (err) {
      console.error('Couldn\'t read your config file at ./es-migrate.config.js', err)
      return
    }

    await this.strategy.init()
    await this[input._[0]](input)
    await this.strategy.end()
  }

  get _migrationFiles() { // eslint-disable-line class-methods-use-this
    return fs.readdirSync(migrationDir())
      .filter(fileName => /^\d{14}\-\S+\.js$/.test(fileName))
  }

  get _version() { // eslint-disable-line class-methods-use-this
    try {
      const lockFilename = path.resolve(process.cwd(), 'es-migrate.lock')
      fs.accessSync(lockFilename)
      return trim(fs.readFileSync(lockFilename, 'utf8'))
    } catch (err) {
      return ''
    }
  }

  set _version(version) {
    const versionExists = !!this._migrationFiles.filter(file => file === `${version}.js`).length
    if (!versionExists) {
      console.error('File for version not found')
      return this.version
    }

    const lockFilename = path.resolve(process.cwd(), 'es-migrate.lock')
    fs.writeFileSync(lockFilename, version)
    return version
  }

  _up(input) {
    const tsFromTargetVersion = this._version && tsFromVersion(this._version)

    return this._migrationFiles
      .map(async migrationFile => {
        const migration = require(migrationDir(migrationFile))
        migration.version = migrationFile.split('.')[0]

        if (this._version && tsFromVersion(migration.version) > tsFromTargetVersion) return Promise.resolve()
        if (await this.strategy.hasRan(migration)) return Promise.resolve()

        input.d ?
          console.log(`Dry running ${migration.version}`) :
          console.log(`Running ${migration.version}`)
        return this.strategy.up(migration, input.d)
      })
      // Run promises in sequence
      .reduce((prev, curr) => prev.then(() => curr), Promise.resolve())
  }

  _down(input) {
    const tsFromTargetVersion = this._version && tsFromVersion(this._version)

    return this._migrationFiles.reverse()
      .map(async migrationFile => {
        const migration = require(migrationDir(migrationFile))
        migration.version = migrationFile.split('.')[0]

        if (this._version && tsFromVersion(migration.version) <= tsFromTargetVersion) return Promise.resolve()
        if (!(await this.strategy.hasRan(migration))) return Promise.resolve()

        input.d ?
          console.log(`Dry rolling back ${migration.version}`) :
          console.log(`Rolling back ${migration.version}`)
        return this.strategy.down(migration, input.d)
      })
      // Run promises in sequence
      .reduce((prev, curr) => prev.then(() => curr), Promise.resolve())
  }

  async create(input) {
    if (!input._[1]) {
      console.error('You need to specify a name for the migration')
      return
    }

    const date = new Date()

    const versionName = '' +
      date.getUTCFullYear() +
      zeroPad((date.getUTCMonth() + 1), 2) +
      zeroPad(date.getUTCDate(), 2) +
      zeroPad(date.getUTCHours(), 2) +
      zeroPad(date.getUTCMinutes(), 2) +
      zeroPad(date.getUTCSeconds(), 2) +
      `-${input._[1]}`

    fs.writeFileSync(
      migrationDir(`${versionName}.js`),
      this.strategy.template
    )

    this._version = versionName

    console.log(`Created migrations/${versionName}.js`)
  }

  async sync(input) {
    await this._up(input)
    await this._down(input)
  }

  async version() {
    let i = this._migrationFiles.length - 1
    if (i === -1) return console.error('Couldn\'t get version: no migrations exist yet')

    const toSubtract = process.argv && process.argv[3] && parseInt(process.argv[3].substr(1))
    if (toSubtract && i - toSubtract < 0) return console.error(`Couldn\'t get version: there are only ${this._migrationFiles.length} migrations`)

    if (toSubtract) i -= toSubtract

    console.log(this._migrationFiles[i].split('.')[0])
  }

  async set(input) {
    const targetVersion = input._[1]
    this._version = targetVersion
  }
}
