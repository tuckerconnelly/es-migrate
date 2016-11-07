/* eslint-disable max-len */
const fs = require('fs')
const path = require('path')
const test = require('blue-tape')
const sinon = require('sinon')
const MockDate = require('mockdate')

const ESMigrate = require('../src/ESMigrate')
const { setup } = require('./fixtures')
const MemoryStrategy = require('../src/strategies/Memory')

test('es-migrate', nest => {
  nest.test('…args', async assert => {
    const mocks = { console: { error: sinon.spy() } }
    const esm = setup(mocks)

    await esm.run('es-migrate asdf')
    assert.equal(mocks.console.error.callCount, 1,
      'throws an error if command not recognized')
  })

  nest.test('…create', nest => {
    nest.test('……throws an error if migrationName not given', async assert => {
      const mocks = { console: { error: sinon.spy() } }
      const esm = setup(mocks)

      await esm.run('es-migrate create')
      assert.equal(mocks.console.error.callCount, 1,
        'console.error was called')
    })

    nest.test('……creates migration files', async assert => {
      const esm = setup()
      const myBirthday = 706669323000
      MockDate.set(myBirthday)

      await esm.run('es-migrate create my-migration')
      const migrationFiles = fs.readdirSync('test/migrations')
      const fileContents = fs.readFileSync(`test/migrations/${migrationFiles[0]}`, 'utf8')

      assert.equal(migrationFiles.length, 1,
        'creates a migration file')
      assert.equal(migrationFiles[0], '19920524010203-my-migration.js',
        'created migration file has {YYYYMMDDHHMMSS}-{migrationName} as the file name')
      assert.equal(fileContents, (new MemoryStrategy()).template,
        'creates a migration file with the parsed template as the contents')
    })

    nest.test('……sets the version in the es-migrate.lock file', async assert => {
      const lockFilename = path.resolve(__dirname, ESMigrate.LOCK_FILENAME)
      const esm = setup()
      const myBirthday = 706669323000

      // execution
      MockDate.set(myBirthday)
      await esm.run('es-migrate create sets-version-in-config-1')
      const firstVersion = fs.readFileSync(lockFilename, 'utf8')

      MockDate.set(myBirthday + 1000)
      await esm.run('es-migrate create sets-version-in-config-2')
      const secondVersion = fs.readFileSync(lockFilename, 'utf8')

      // assertion
      assert.equal(firstVersion, '19920524010203-sets-version-in-config-1',
        'sets it when no lock file is present')
      assert.equal(secondVersion, '19920524010204-sets-version-in-config-2',
        'sets it when a lockfile already exists')
    })
  })

  nest.test('…set', async nest => {
    nest.test('……set the version in the lock file', async assert => {
      const lockFilename = path.resolve(__dirname, ESMigrate.LOCK_FILENAME)
      const esm = setup()

      await esm.run('es-migrate create test-set-1')
      await esm.run('es-migrate create test-set-2')
      await esm.run('es-migrate set 19920524010304-test-set-1')
      const lockVersion = fs.readFileSync(lockFilename, 'utf8')

      assert.equal(lockVersion, '19920524010304-test-set-1',
        'sets the version')
    })

    nest.test('……throws an error if the version isn\'t found', async assert => {
      const lockFilename = path.resolve(__dirname, ESMigrate.LOCK_FILENAME)
      const console = { error: sinon.spy() }
      const esm = setup({ console })
    
      await esm.run('es-migrate create test-set-error')
      const versionBefore = fs.readFileSync(lockFilename, 'utf8')
      await esm.run('es-migrate set notaversion')
      const versionAfter = fs.readFileSync(lockFilename, 'utf8')
    
      assert.equal(console.error.callCount, 1,
        'throws an error')
      assert.equal(versionBefore, versionAfter,
        'version doesn\'t change')
    })
  })

  nest.test('…sync', async nest => {
    nest.test('……runs unran migrations', async assert => {
      const esm = setup()
  
      await esm.run('es-migrate create test-migration')
      await esm.run('es-migrate create test-migration-2')
      await esm.run('es-migrate sync')
      const migrationsRun = Object.keys(esm.strategy.migrations).length
      esm.strategy.up = sinon.stub().returns(Promise.resolve())
      await esm.run('es-migrate create test-migration-3')
      await esm.run('es-migrate sync')
  
      assert.equal(migrationsRun, 2,
        'runs the migrations in the migrations/ folder')
      assert.equal(esm.strategy.up.callCount, 1,
        'doesn\'t run migrations that have already run')
    })
  
    nest.test('……rolls back migrations', async assert => {
      const esm = setup()
      const myBirthday = 706669323000
  
      MockDate.set(myBirthday)
      await esm.run('es-migrate create down-1')
      MockDate.set(myBirthday + 1000)
      await esm.run('es-migrate create down-2')
      MockDate.set(myBirthday + 2000)
      await esm.run('es-migrate create down-3')
      MockDate.set(myBirthday + 3000)
      await esm.run('es-migrate create down-4')
      await esm.run('es-migrate sync')
  
      await esm.run('es-migrate set 19920524010205-down-3')
      await esm.run('es-migrate sync')
      const migrationsRunAfterDown = Object.keys(esm.strategy.migrations).length
  
      const oldDown = esm.strategy.down
      const downStub = sinon.stub().returns(Promise.resolve())
      esm.strategy.down = downStub
      await esm.run('es-migrate set 19920524010205-down-3')
      await esm.run('es-migrate sync')
      esm.strategy.down = oldDown
      await esm.run('es-migrate set 19920524010203-down-1')
      await esm.run('es-migrate sync')
      const migrationsRunAfterSyncFirst = Object.keys(esm.strategy.migrations).length
  
      assert.equal(migrationsRunAfterDown, 3,
        'rolls back the last migration')
      assert.equal(downStub.callCount, 0,
        'doesn\'t roll back a migration if it\'s in an un-ran state')
      assert.equal(migrationsRunAfterSyncFirst, 1,
        'rolls back migrations that haven\'t been ran yet')
    })
    
    nest.test('runs migrations even if there\'s a newline at the end of the lockfile', async assert => {
      const esm = setup()

      await esm.run('es-migrate create test-migration')
      await esm.run('es-migrate create test-migration-2')
      fs.writeFileSync(
        path.resolve(__dirname, './es-migrate.lock'),
        '19920524011106-test-migration-2\n'
      )
      await esm.run('es-migrate sync')
      const migrationsRun = Object.keys(esm.strategy.migrations).length

      assert.equal(migrationsRun, 2, 'runs migrations')
    })

    nest.test('……`sync -d` (dry run) runs the migration without marking it as `hasRan`', async assert => {
      const esm = setup()
    
      await esm.run('es-migrate create dry-1')
      await esm.run('es-migrate sync -d')
      const migration = { version: fs.readdirSync('test/migrations')[0].split('.')[0] }
    
      assert.ok(!(await esm.strategy.hasRan(migration)))
    })
  })

  nest.test('…version', nest => {
    nest.test('……gets the latest version when no args passed', async assert => {
      const mocks = { console: { log: sinon.spy() } }
      const esm = setup(mocks)
      const myBirthday = 706669323000
  
      MockDate.set(myBirthday)
      await esm.run('es-migrate create version-test-1')
      await esm.run('es-migrate version')
      MockDate.set(myBirthday + 1000)
      await esm.run('es-migrate create version-test-2')
      await esm.run('esmigrate version')
  
      assert.equal(mocks.console.log.getCall(1).args[0], '19920524010203-version-test-1',
        'returns the latest version after making a migration')
      assert.equal(mocks.console.log.getCall(3).args[0], '19920524010204-version-test-2',
        'returns the latest version after making a second migration')
    })
  
    nest.test('……-1 gets the previous version', async assert => {
      const mocks = {
        console: { log: sinon.spy() },
        process: {
          argv: ['', 'es-migrate', 'version', '-1'],
          cwd: () => `${process.cwd()}/test`,
        },
      }
      const esm = setup(mocks)
      const myBirthday = 706669323000
  
      MockDate.set(myBirthday)
      await esm.run('es-migrate create version-p-test-1')
      MockDate.set(myBirthday + 1000)
      await esm.run('es-migrate create version-p-test-2')
      await esm.run('es-migrate version -1')
  
      assert.equal(mocks.console.log.getCall(2).args[0], '19920524010203-version-p-test-1',
        '-1 returns the previous version')
    })
  
    nest.test('……-2 gets the previous previous version', async assert => {
      const mocks = {
        console: { log: sinon.spy() },
        process: {
          argv: ['', 'es-migrate', 'version', '-2'],
          cwd: () => `${process.cwd()}/test`,
        },
      }
      const esm = setup(mocks)
      const myBirthday = 706669323000

      MockDate.set(myBirthday)
      await esm.run('es-migrate create version-p-test-1')
      MockDate.set(myBirthday + 1000)
      await esm.run('es-migrate create version-p-test-2')
      MockDate.set(myBirthday + 2000)
      await esm.run('es-migrate create version-p-test-3')
      await esm.run('es-migrate version -2')

      assert.equal(mocks.console.log.getCall(3).args[0], '19920524010203-version-p-test-1',
        '-2 returns the previous previous version')
    })
  })
})
