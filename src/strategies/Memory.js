// For tests

module.exports = class MemoryStrategy {
  get template() { // eslint-disable-line class-methods-use-this
    return `module.exports = {
  async up(client) {

  },

  async down(client) {

  },
}
`
  }

  async init() {
    if (!this.migrations) this.migrations = {}
  }

  async hasRan(migration) {
    return !!this.migrations[migration.version]
  }

  async up(migration, dry) {
    await migration.up()
    if (!dry) this.migrations[migration.version] = true
  }

  async down(migration, dry) {
    await migration.down()
    if (!dry) delete this.migrations[migration.version]
  }

  async end() {}
}
