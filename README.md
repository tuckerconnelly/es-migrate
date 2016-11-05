es-migrate
==========

Declarative es6 migrations.

```
npm -g i es-migrate
npm -D i es-migrate
```

```
es-migrate

Usage:
  $ es-migrate [create|sync|version|set] [name|version] [-d]

`create [name]` will make a new migration and set the version in the config file
`sync` will sync to the version in the config file
`sync -d` will do a dry run of the sync, running the migration but not adding it to the migrations table (useful for testing)
`version` will get the current version
`version -1` will get the previous version (-2 will get 2 versions ago, etc.)
`set [version]` will set the version in the config file to the specified version
```

## Philosophy

- Each commit of your code should be *declaratively* associated with a version of your database
- Syncing your database to your code should be as easy as `es-migrate sync`
- Configuration should programmatic so you can use an existing config file or library
- It should be easy to plug in a new database strategy
- It should keep up to date with the latest ES features

## Usage

Create a git submodule at `./migrations/`--this will hold your migrations.

Create a config file at `{cwd}/es-migrate.config.js` that looks something like this:

```js
const { PGStrategy } = require('es-migrate')

module.exports = new  PGStrategy('postgres://username:password@localhost/dbname')
```

Then you can:

```
es-migrate create my-migration
es-migrate sync
```

This will create a migration file at `migrations/` that looks like this:

```
module.exports = {
  async up(client) {

  },

  async down(client) {

  },
}
```

The `up` method gets run when advancing the database version, and the `down` method gets run when rolling back the version.

---

`es-migrate create [version]` will also create a lock file `es-migrate.lock` with the new database version. When you commit that lock file, you're saying, this version of the code depends on this version of the database.

Then, if something goes wrong, you can revert your code and run `es-migrate sync` and know that the database is set to the correct version.

## The migrations/ folder

The migrations/ folder should be a [git submodule](https://git-scm.com/docs/git-submodule). This is so if you revert your main code, and the database needs to roll back to a previous version, the migrations and their `down` commands are still available.

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
