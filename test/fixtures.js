const fs = require('fs')
const path = require('path')
const sinon = require('sinon')
const rewire = require('rewire')
const MockDate = require('mockdate')

const myBirthday = 706669323000
MockDate.set(myBirthday)

function setup(mocks) {
  // Clean up
  const files = fs.readdirSync('test/migrations')
  files.forEach(file => fs.unlinkSync(`test/migrations/${file}`))
  delete require.cache[path.resolve('test/migrations/index.js')]

  // New migrations/index.js
  fs.writeFileSync('test/migrations/index.js',
`const MemoryStrategy = require('../../src/strategies/Memory')

module.exports = new MemoryStrategy()
`)

  const defaultMocks = {
    console: Object.assign({}, console, {
      error: sinon.spy(),
    }),
    process: Object.assign({}, console, {
      cwd: () => `${process.cwd()}/test`,
    }),
  }

  const defaultedMocks = Object.assign({}, defaultMocks, mocks)

  const ESMigrate = rewire('../src/ESMigrate.js')
  ESMigrate.__set__('console', defaultedMocks.console)
  ESMigrate.__set__('process', defaultedMocks.process)

  const esm = new ESMigrate()

  const oldRun = esm.run
  esm.run = async (...args) => {
    await oldRun.apply(esm, args)

    const oneMinute = 60 * 1000
    MockDate.set(Date.now() + oneMinute)
  }

  return { esm, mocks: defaultedMocks }
}

module.exports = { setup }
