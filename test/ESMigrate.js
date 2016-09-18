/* eslint-disable max-len */
import fs from 'fs'
import test from 'blue-tape'
import sinon from 'sinon'
import MockDate from 'mockdate'

import { setup } from './fixtures'
import MemoryStrategy from '../src/strategies/Memory'

test('es-migrate', async nest => {
  nest.test('…args', async () => {
    const { esm, mocks } = setup()

    await esm.run('es-migrate asdf')
    nest.equal(mocks.console.error.callCount, 1,
      'throws an error if command not recognized')
  })

  nest.test('…create', nest => {
    nest.test('……throws an error if migrationName not given', async assert => {
      const { esm, mocks } = setup()

      await esm.run('es-migrate create')
      assert.equal(mocks.console.error.callCount, 1,
        'console.error was called')
    })

    nest.test('……creates migration files', async assert => {
      const { esm } = setup()
      const myBirthday = 706669323000
      MockDate.set(myBirthday)

      await esm.run('es-migrate create my-migration')
      const migrationFiles = fs.readdirSync('test/migrations')
      const fileContents = fs.readFileSync(`test/migrations/${migrationFiles[0]}`, 'utf8')

      assert.equal(migrationFiles.length, 2,
        'creates a migration file')
      assert.equal(migrationFiles[0], '19920524010203-my-migration.js',
        'created migration file has {YYYYMMDDHHMMSS}-{migrationName} as the file name')
      assert.equal(fileContents, (new MemoryStrategy).template,
        'creates a migration file with the parsed template as the contents')
    })
  })

  nest.test('…sync', async nest => {
    nest.test('……runs unran migrations', async assert => {
      const { esm } = setup()

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
      const { esm } = setup()
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

      await esm.run(`es-migrate sync 19920524010205-down-3`)
      const migrationsRunAfterDown = Object.keys(esm.strategy.migrations).length
      const oldDown = esm.strategy.down
      const downStub = sinon.stub().returns(Promise.resolve())
      esm.strategy.down = downStub
      await esm.run('es-migrate sync 19920524010205-down-3')
      esm.strategy.down = oldDown
      await esm.run('es-migrate sync 19920524010203-down-1')
      const migrationsRunAfterSyncFirst = Object.keys(esm.strategy.migrations).length

      assert.equal(migrationsRunAfterDown, 3,
        'rolls back the last migration if no count supplied')
      assert.equal(downStub.callCount, 0,
        'doesn\'t roll back a migration if it\'s in an un-ran state')
      assert.equal(migrationsRunAfterSyncFirst, 1,
        'rolls back migrations that haven\'t been ran yet')
    })
  })

  nest.test('…version', nest => {
    nest.test('……gets the latest version when no args passed', async assert => {
      const { esm, mocks } = setup({ console: { log: sinon.spy() } })
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
      const { esm, mocks } = setup({
        console: { log: sinon.spy() },
        process: {
          argv: ['', 'es-migrate', 'version', '-1'],
          cwd: () => `${process.cwd()}/test`,
        },
      })
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
      const { esm, mocks } = setup({
        console: { log: sinon.spy() },
        process: {
          argv: ['', 'es-migrate', 'version', '-2'],
          cwd: () => `${process.cwd()}/test`,
        },
      })
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
