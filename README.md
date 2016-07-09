es-migrate
==========

Minimalistic database-agnostic es6 migrations.

```
npm -g i es-migrate
npm -D i es-migrate
```

```
es-migrate

Usage:
  $ es-migrate [up|down|create] [migrationName|count]

`up` will run all un-ran migrations. `down` will roll back only one at a time, unless a count is supplied.
```

## Usage

`es-migrate` reads a config file at `{cwd}/migrations/index.js`.  Create a file there:

```js
import { PGStrategy } from 'es-migrate'

const connectionString = process.env.DB_STRING ||
  'postgres://username:password@localhost/dbname'

export default new PGStrategy(connectionString)
```

Then you can:

```
es-migrate create my-migration
es-migrate up
```

Then if you wanted to run es-migrate against a different database, you could:

```
DB_STRING=postgres://u:p@localhost/test es-migrate up
```

## Using with other databases

If you want to connect to another database like MongoDB, you'll need to write a custom strategy:

```js
export default class MyStrategy {
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
    // Create database connection and initializes migrations table if it doesn't exist
  }

  async hasRan(migration) {
    // returns true if the passed migration has run, false if not
  }

  async up(migration) {
    await migration.up()
    // Then tell the database the migration has run
  }

  async down(migration) {
    await migration.down()
    // Then delete the migration from the database
  }

  async end() {
    // Clean up the database connection
  }
}
```

See the `strategies/` folder for examples.

Will gladly accept PRs for additional strategies :)

## License
MIT
