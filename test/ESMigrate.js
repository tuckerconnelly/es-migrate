/* eslint-disable max-len */
import fs from 'fs'
import path from 'path'
import test from 'blue-tape'
import rewire from 'rewire'
import MockDate from 'mockdate'
import sinon from 'sinon'

import MemoryStrategy from '../src/strategies/Memory'

const myBirthday = 706669323000
MockDate.set(myBirthday)

// Factory
function MockESM(mocks) {
  const defaultMocks = {
    console: {
      ...console,
      error: sinon.spy(),
    },
    process: {
      ...process,
      cwd: () => `${process.cwd()}/test`,
    },
  }

  const defaultedMocks = { ...defaultMocks, ...mocks }

  const ESMigrate = rewire('../src/ESMigrate.js')
  ESMigrate.__set__('console', defaultedMocks.console)
  ESMigrate.__set__('process', defaultedMocks.process)

  const esMigrate = new ESMigrate()
  esMigrate.mocks = defaultedMocks
  return esMigrate
}

function cleanUp() {
  // Clean migration directory
  const files = fs.readdirSync('test/migrations')
  files.splice(files.indexOf('index.js'), 1)
  files.forEach(file => fs.unlinkSync(`test/migrations/${file}`))

  // Reset migrations/index
  delete require.cache[path.resolve('test/migrations/index.js')]
}

test('es-migrate', async nest => {
  const mockESM = MockESM()
  const { mocks } = mockESM

  await mockESM.run('es-migrate asdf')
  nest.equal(mocks.console.error.callCount, 1,
    'throws an error if command not recognized')

  nest.test('…create', async assert => {
    const mockESM = MockESM()
    const { mocks } = mockESM

    await mockESM.run('es-migrate create')
    assert.equal(mocks.console.error.callCount, 1,
      'throws an error if migrationName not given')

    await mockESM.run('es-migrate create my-migration')
    const migrationFiles = fs.readdirSync('test/migrations')
    assert.equal(migrationFiles.length, 2,
      'creates a migration file')
    assert.equal(migrationFiles[0], '19920524010203-my-migration.js',
      'created migration file has {YYYYMMDDHHMMSS}-{migrationName} as the file name')

    const fileContents = fs.readFileSync(`test/migrations/${migrationFiles[0]}`, 'utf8')
    assert.equal(fileContents, (new MemoryStrategy).template,
      'creates a migration file with the parsed template as the contents')

    cleanUp()
  })

  nest.test('…up', async nest => {
    nest.test('……running migrations', async assert => {
      const mockESM = MockESM()

      await mockESM.run('es-migrate create test-migration')
      await mockESM.run('es-migrate create test-migration-2')
      await mockESM.run('es-migrate up')
      const migrationsRun = Object.keys(mockESM.strategy.migrations).length
      assert.equal(migrationsRun, 2,
        'runs the migrations in the migrations/ folder')

      mockESM.strategy.up = sinon.stub().returns(Promise.resolve())
      await mockESM.run('es-migrate create test-migration-3')
      await mockESM.run('es-migrate up')
      assert.equal(mockESM.strategy.up.callCount, 1,
        'doesn\'t run migrations that have already run')

      cleanUp()
    })
  })

  nest.test('…down', async assert => {
    const mockESM = MockESM()

    await mockESM.run('es-migrate create test-migration-1')
    await mockESM.run('es-migrate create test-migration-2')
    await mockESM.run('es-migrate create test-migration-3')
    await mockESM.run('es-migrate create test-migration-4')
    await mockESM.run('es-migrate up')

    await mockESM.run('es-migrate down')
    let migrationsRun = Object.keys(mockESM.strategy.migrations).length
    assert.equal(migrationsRun, 3,
      'rolls back the last migration if no count supplied')

    await mockESM.run('es-migrate down')
    const oldDown = mockESM.strategy.down
    mockESM.strategy.down = sinon.stub().returns(Promise.resolve())
    assert.equal(mockESM.strategy.down.callCount, 0,
      'doesn\'t roll back a migration if it\'s in an un-ran state')
    mockESM.strategy.down = oldDown

    await mockESM.run('es-migrate down 3')
    migrationsRun = Object.keys(mockESM.strategy.migrations).length
    assert.equal(migrationsRun, 2,
      'rolls back {count} migrations that haven\'t been ran yet')

    cleanUp()
  })
})
