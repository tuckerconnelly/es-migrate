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
  $ es-migrate [create|sync|version] [name|version] [-d]

`create` will make a new migration.
`sync` will sync to the specified version (if none is given, latest).
`sync -d` will do a dry run of the sync, running the migration but not adding it to the migrations table (useful for testing)
`version` will get the current version.
`version -1` will get the previous version (-2 will get 2 versions ago, etc.)
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
es-migrate sync
```

Then if you wanted to run es-migrate against a different database, you could:

```
DB_STRING=postgres://u:p@localhost/test es-migrate sync
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

  async up(migration, dry) {
    await migration.up()
    // If not dry, then tell the database the migration has run
  }

  async down(migration, dry) {
    await migration.down()
    // If not dry, then delete the migration from the database
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
