const { exec } = require('child_process')
const Pg = require('pg')
const coPg = require('co-pg')

const pg = coPg(Pg)

module.exports = class PGStrategy {
  constructor(config) {
    this._config = config
  }

  get template() { // eslint-disable-line class-methods-use-this
    return `module.exports = {
    up(client) {
      return client.query(\`\`)
    },

    down(client) {
      return client.query(\`\`)
    },
  }
`
  }

  async init() {
    this.client = new pg.Client(this._config)
    await this.client.connectPromise()
    await this.client.queryPromise(`
      CREATE TABLE IF NOT EXISTS migrations (
        version varchar(255) UNIQUE NOT NULL
      )
    `)
  }

  async hasRan(migration) {
    const result = await this.client.queryPromise(
      'SELECT version FROM migrations WHERE version = $1',
      [migration.version]
    )

    return result.rows.length === 1
  }

  async up(migration, dry) {
    await migration.up(this.client)
    if (!dry) {
      await this.client.queryPromise(
        'INSERT INTO migrations VALUES ($1)',
        [migration.version]
      )
    }
    await exec(`pg_dump -s ${this.client.database} > migrations/schema.sql`)
  }

  async down(migration, dry) {
    await migration.down(this.client)
    if (!dry) {
      await this.client.queryPromise(
        'DELETE FROM migrations WHERE version = $1',
        [migration.version]
      )
    }
  }

  end() {
    this.client.end()
  }
}
