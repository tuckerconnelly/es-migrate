import Pg from 'pg'
import coPg from 'co-pg'

const pg = coPg(Pg)

export default class PGStrategy {
  constructor(connectionString) {
    this.connectionString = connectionString
  }

  static template = `export default {
  async up(client) {

  },

  async down(client) {

  },
}
`

  async init() {
    this.client = await pg.Client(this.connectionString)
    await this.client.queryPromise(`
      CREATE TABLE IF NOT EXISTS migrations (
        version varchar(255) NOT NULL
      )
    `)
  }

  async check(migration) {
    const result = await this.client.queryPromise(
      'SELECT version FROM migrations WHERE version = $1'
      [migration.version],
    )

    return result.rows.length === 1
  }

  async up(migration) {
    await migration.up(this.client)
    await this.client.queryPromise(
      'INSERT INTO migrations VALUES ($1)',
      [migration.version],
    )
  }

  async down(migration) {
    await migration.down(this.client)
    await this.client.queryPromise(
      'DELETE FROM migrations WHERE version = $1',
      [migration.version],
    )
  }

  end() {
    this.client.end()
  }
}
