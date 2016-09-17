import fs from 'fs'
import path from 'path'
import sinon from 'sinon'
import rewire from 'rewire'
import MockDate from 'mockdate'

const myBirthday = 706669323000
MockDate.set(myBirthday)

export function setup(mocks) {
  // Clean up
  const files = fs.readdirSync('test/migrations')
  files.forEach(file => fs.unlinkSync(`test/migrations/${file}`))
  delete require.cache[path.resolve('test/migrations/index.js')]

  // New migrations/index.js
  fs.writeFileSync('test/migrations/index.js', `
  import MemoryStrategy from '../../src/strategies/Memory'

  export default new MemoryStrategy()
  `)

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

  return { esm: new ESMigrate(), mocks: defaultedMocks }
}
