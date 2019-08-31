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


const cycles = 500000
const warmup = 50000
const iterations = 3

console.log(`NetList size is ${s.netList.length}`)
console.log(`Warming up...`)

for (let i = 0; i <= warmup; i += 1) s.posedge(CLK)

console.log(`Beginning performance test...`)

const times = []
for (let i = 1; i <= iterations; i += 1) {
    console.log(`Iteration ${i}/${iterations}`)
    const start = performance.now()
    for (let i = 0; i <= cycles; i += 1) s.posedge(CLK)
    const end = Math.floor(performance.now() - start)
    times.push(Number(end))
}

const average = Math.floor(times.reduce((acc, e) => acc + e, 0) / times.length)
const stddev = Math.floor(Math.sqrt(times.map(v => (v - average) ** 2).reduce((acc, e) => acc + e, 0) / times.length))

console.log(`Executed ${cycles} full cycles in ${average}ms ± ${stddev} ~= ${(cycles * 1000) / average} μops/s`)