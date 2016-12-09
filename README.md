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

### Philosophy

- Each commit of your code should be *declaratively* associated with a version of your database
- Syncing your database to your code should be as easy as `es-migrate sync`
- Configuration should programmatic so you can use an existing config file or library
- It should be easy to plug in a new database strategy
- It should keep up to date with the latest ES features

### Setup

Create a git submodule at `./migrations/`. This will hold your migrations, and needs to be a git repo so the migrations still exist if you decide to revert your main codebase to a previous version/commit.

Next create a config file at `[project dir]/es-migrate.config.js` that looks like this:

```js
const { PGStrategy } = require('es-migrate')

module.exports = new  PGStrategy('postgres://username:password@localhost/dbname')
```

You can plug in any number of strategies to support other databases (see below), but currently only Postgres is supported.

### Usage

Create a migration file using

```
es-migrate create my-migration
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

Modify the `up` method to describe how to move the database from its current state to the required state.  Modify the `down` method so whatever's done in the `up` method can be rolled back.

`es-migrate create [version]` will also create a lock file `es-migrate.lock` with the new database version.

Run `es-migrate sync` to sync the database to the version in the lockfile (should run your most recent migration).

If you want to run the migration without marking it as "has already ran" so you can run it continuously, you can use `es-migrate sync -d`. You can use this to test your migration until it's ready to be committed.

### When shit hits the fan

So you've been using the workflow above, creating migrations and syncing to them. But something went wrong in production and you need to roll back the code and the database.

You can do `git revert abcdef` to revert the problem commit, and then `es-migrate sync` to sync to the previous lockfile.

### Using with other databases

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

### Connect

Follow the creator on Twitter, [@TuckerConnelly](https://twitter.com/TuckerConnelly)

### License
MIT
