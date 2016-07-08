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
    return !!this.migrations[migration.id]
  }

  async up(migration) {
    await migration.up()
    this.migrations[migration.id] = true
  }

  async down(migration) {
    await migration.down()
    delete this.migrations[migration.id]
  }

  async end() {}
}
