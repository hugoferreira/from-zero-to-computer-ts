import { SAP1, buildMicrocode, microcodeTable } from './sap1/sap-1'
import { Suite } from 'benchmark'

const program = new Uint8Array([0x01, 0x10, 0x02, 0x02, 0x10, 0x08, 0x1C, 0x1F, 0x04])

const s = new SAP1()
const CLK = s.clock(1, false)
const RESET = s.wire()
const ram = new Uint8Array(256)

s.build(CLK, RESET, buildMicrocode(microcodeTable), ram)
s.load(ram, program)
s.do()

console.log(`NetList size is ${s.netList.length}`)

const suite = new Suite()

suite.add('SAP1 Benchmark', () => { s.posedge(CLK) })
.on('cycle', function (event: any) { console.log(String(event.target)) })
.run()