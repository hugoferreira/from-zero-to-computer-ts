import { SAP1, buildMicrocode, microcodeTable } from './sap-1'
import { performance } from 'perf_hooks'

const program = new Uint8Array([0x01, 0x10, 0x02, 0x02, 0x10, 0x08, 0x1C, 0x1F, 0x04])

const s = new SAP1()
const CLK = s.clock(1, false)
const RESET = s.wire()
const ram = new Uint8Array(256)

s.build(CLK, RESET, buildMicrocode(microcodeTable), ram)
s.load(ram, program)
s.do()

const cycles = 500000n
const warmup = 10000n

console.log(`NetList size is ${s.netList.length}`)

console.log(`Warming up...`)

for (let i = 0; i <= warmup; i += 1) s.posedge(CLK)

console.log(`Beginning performance test...`)

const start = performance.now()
for (let i = 0; i <= cycles; i += 1) s.posedge(CLK)
const end = BigInt(Math.floor(performance.now() - start))

console.log(`Executed ${cycles} full cycles in ${end}ms ~= ${(cycles * 1000n) / end} μops/s`)