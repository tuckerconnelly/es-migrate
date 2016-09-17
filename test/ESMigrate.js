/* eslint-disable max-len */
import fs from 'fs'
import test from 'blue-tape'
import sinon from 'sinon'

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

  nest.test('…up', async assert => {
    const { esm } = setup()

    await esm.run('es-migrate create test-migration')
    await esm.run('es-migrate create test-migration-2')
    await esm.run('es-migrate up')
    const migrationsRun = Object.keys(esm.strategy.migrations).length
    esm.strategy.up = sinon.stub().returns(Promise.resolve())
    await esm.run('es-migrate create test-migration-3')
    await esm.run('es-migrate up')

    assert.equal(migrationsRun, 2,
      'runs the migrations in the migrations/ folder')
    assert.equal(esm.strategy.up.callCount, 1,
      'doesn\'t run migrations that have already run')
  })

  nest.test('…down', async assert => {
    const { esm } = setup()
    await esm.run('es-migrate create test-migration-1')
    await esm.run('es-migrate create test-migration-2')
    await esm.run('es-migrate create test-migration-3')
    await esm.run('es-migrate create test-migration-4')
    await esm.run('es-migrate up')

    await esm.run('es-migrate down')
    const migrationsRunAfterDown = Object.keys(esm.strategy.migrations).length
    const oldDown = esm.strategy.down
    const downStub = sinon.stub().returns(Promise.resolve())
    esm.strategy.down = downStub
    await esm.run('es-migrate down')
    esm.strategy.down = oldDown
    await esm.run('es-migrate down 3')
    const migrationsRunAfterDown3 = Object.keys(esm.strategy.migrations).length

    assert.equal(migrationsRunAfterDown, 3,
      'rolls back the last migration if no count supplied')
    assert.equal(downStub.callCount, 0,
      'doesn\'t roll back a migration if it\'s in an un-ran state')
    assert.equal(migrationsRunAfterDown3, 2,
      'rolls back {count} migrations that haven\'t been ran yet')
  })
})
