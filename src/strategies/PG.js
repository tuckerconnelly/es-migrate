import Pg from 'pg'
import coPg from 'co-pg'

const pg = coPg(Pg)

export default class PGStrategy {
  constructor(connectionString) {
    this.connectionString = connectionString
  }

  get template() {
    return `export default {
    async up(client) {
      client.query(``)
    },

    async down(client) {
      clientquery(``)
    },
  }
`
  }

  async init() {
    this.client = new pg.Client(this.connectionString)
    await this.client.connectPromise()
    await this.client.queryPromise(`
      CREATE TABLE IF NOT EXISTS migrations (
        id varchar(255) UNIQUE NOT NULL
      )
    `)
  }

  async hasRan(migration) {
    const result = await this.client.queryPromise(
      'SELECT id FROM migrations WHERE id = $1',
      [migration.id],
    )

    return result.rows.length === 1
  }

  async up(migration) {
    await migration.up(this.client)
    await this.client.queryPromise(
      'INSERT INTO migrations VALUES ($1)',
      [migration.id],
    )
  }

  async down(migration) {
    await migration.down(this.client)
    await this.client.queryPromise(
      'DELETE FROM migrations WHERE id = $1',
      [migration.id],
    )
  }

  end() {
    this.client.end()
  }
}
