#!/usr/bin/env node
// Runs the local containers (PostgreSQL and Garage, the S3-compatible image store) with whatever
// is available: Docker or Podman.
// Usage: node scripts/db.mjs up|down|logs
// Override detection with COMPOSE_CMD, e.g. COMPOSE_CMD="podman-compose"
import { spawnSync } from 'node:child_process'

const candidates = [
  { cmd: ['docker', 'compose'], probe: ['version'] },
  { cmd: ['podman', 'compose'], probe: ['version'] },
  { cmd: ['podman-compose'], probe: ['--version'] },
  { cmd: ['docker-compose'], probe: ['--version'] },
]

const works = ({ cmd, probe }) =>
  spawnSync(cmd[0], [...cmd.slice(1), ...probe], { stdio: 'ignore' }).status === 0

const compose = process.env.COMPOSE_CMD
  ? process.env.COMPOSE_CMD.split(' ')
  : candidates.find(works)?.cmd

if (!compose) {
  console.error('No container runtime found. Install Docker or Podman (with a compose provider).')
  process.exit(1)
}

const actions = { up: ['up', '-d', 'db', 'garage'], down: ['down'], logs: ['logs', '-f', 'db', 'garage'] }
const args = actions[process.argv[2]]
if (!args) {
  console.error('Usage: node scripts/db.mjs up|down|logs')
  process.exit(1)
}

console.log(`> ${[...compose, ...args].join(' ')}`)
const result = spawnSync(compose[0], [...compose.slice(1), ...args], { stdio: 'inherit' })
process.exit(result.status ?? 1)
