#!/usr/bin/env node
// Runs the API and the web frontends together, one prefixed line per output line. Ctrl+C stops them all.
//   npm run dev:all                 -> api, admin and mobile
//   npm run dev:all -- api mobile   -> only those (also: site)
// The database and storage must be up first: `npm run db:up`.
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'

const WORKSPACES = { api: '@kinotest/api', admin: '@kinotest/admin', mobile: '@kinotest/mobile', site: '@kinotest/site' }
const names = process.argv.length > 2 ? process.argv.slice(2) : ['api', 'admin', 'mobile']

const unknown = names.filter((n) => !(n in WORKSPACES))
if (unknown.length > 0) {
  console.error(`Unknown: ${unknown.join(', ')}. Valid: ${Object.keys(WORKSPACES).join(', ')}`)
  process.exit(1)
}

const width = Math.max(...names.map((n) => n.length))
const children = []
let stopping = false

function stopAll(code) {
  if (stopping) return
  stopping = true
  for (const c of children) c.kill('SIGTERM')
  process.exitCode = code
  setTimeout(() => process.exit(code), 3000).unref() // do not hang if a child ignores the signal
}

for (const name of names) {
  const child = spawn('npm', ['run', 'dev', '-w', WORKSPACES[name]], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32', // npm is npm.cmd on Windows
  })
  children.push(child)
  const label = `[${name.padEnd(width)}]`
  for (const stream of [child.stdout, child.stderr]) {
    createInterface({ input: stream }).on('line', (line) => console.log(`${label} ${line}`))
  }
  child.on('exit', (code) => {
    if (stopping) return
    console.error(`${label} exited with code ${code}; stopping the rest`)
    stopAll(code ?? 1)
  })
}

process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))
