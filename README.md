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
  $ es-migrate [create|sync|version] [name|version]

`create` will make a new migration. `sync` will sync to the specified version (if none is given, latest). `version` will get the current version.

`es-migrate version -1` will get the previous version (-2 will get 2 versions ago, etc.)
```

## Usage

`es-migrate` reads a config file at `{cwd}/migrations/index.js`.  Create a file there:

```js
const PGStrategy = require('es-migrate').PGStrategy
const config = require('../lib/config')

module.exports = new PGStrategy(config.PG_CONFIG)
```

(Note: Had some trouble getting babel-node to work across both linux and osx with `#!/usr/bin/env`, so migrations gotta be in node-flavored ES6 for now)

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
    return `module.exports = {
  up(client) {

  },

  down(client) {

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
