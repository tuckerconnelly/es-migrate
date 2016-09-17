// For tests

export default class MemoryStrategy {
  get template() {
    return `export default {
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

  async up(migration) {
    await migration.up()
    this.migrations[migration.version] = true
  }

  async down(migration) {
    await migration.down()
    delete this.migrations[migration.version]
  }

  async end() {}
}
