import * as c from 'colors'
import { toDec } from '../circuitsimulator'
import { SAP1, buildMicrocode, microcodeTable } from './sap-1'
import { dumpRAM, dumpRegisters } from './repl'
import { asm, unasm, LDA, LDB, ADD, STA, JMP, REPEAT } from './assembler'
import { subtractExample, counterExample, loopExample, addExample, memoryExample, haltExample } from './examples'

// Simple command-line argument handling
const args = process.argv.slice(2)
const exampleName = args[0] || 'subtract' // Default to subtract example

// Map of available examples
const examples: Record<string, Uint8Array> = {
    'subtract': subtractExample,
    'counter': counterExample,
    'loop': loopExample,
    'add': addExample,
    'memory': memoryExample,
    'halt': haltExample
}

// Get the selected example program
const program = examples[exampleName] || subtractExample
console.log(`Running ${exampleName} example\n`)

const s = new SAP1()
const CLK = s.clock(1, false)
const RESET = s.wire()
const ram = new Uint8Array(256)

const computer = s.build(CLK, RESET, buildMicrocode(microcodeTable), ram)
const { MAR_DATA, STEP, PC_DATA, DBUS, OUT_DATA, HALT, clockGate } = computer

s.load(ram, program)
s.do() // Initialize simulation

// Print the program in memory
console.log("Program in memory:")
for (let i = 0; i < program.length; i++) {
    console.log(`[${i}]: ${ram[i].toString(2).padStart(8, '0')} (${ram[i]})`)
}
console.log("\nExecution:")

const toHex = (...xs: (number | string)[]) => xs.map(x => `${x.toString(16).toUpperCase().padStart(2, '0')}`) 

// Use automatic UI update or interactive execution based on presence of --interactive flag
const isInteractive = args.includes('--interactive')

if (isInteractive) {
    // Interactive mode with UI updates
    CLK.onChange(() => {
        if (toDec(STEP) === 0) {
            console.log(`PC: ${toDec(PC_DATA)}, Output: ${toDec(OUT_DATA)}`)
        }
    })

    setInterval(() => {
        if (!HALT.get()) {
            s.posedge(clockGate)
        }
    }, 500) // Slower clock for better visibility

    setInterval(() => {
        console.clear()
        dumpRAM(ram, toDec(MAR_DATA))
        console.log()
        dumpRegisters(computer)
        console.log()
        try {
            const pc = toDec(PC_DATA)
            console.log(unasm(ram.slice(pc, pc + 2)).map(op => 
                `${c.green('CODE')}\t${c.cyan(toHex(...op.code).join(' ').padEnd(7))}\t${c.green('ASM')}\t${op}`)[0])
        } catch { }
        
        if (HALT.get()) {
            console.log(c.red("\nProgram halted! Final output value:"), c.green(`${toDec(OUT_DATA)}`))
        }
    }, 100)
} else {
    // Non-interactive automatic execution
    let cycles = 0
    let maxCycles = 200
    let halted = false

    while (cycles < maxCycles && !halted) {
        // Process simulation step
        s.posedge(clockGate) // Use the gated clock that respects HALT
        
        const step = toDec(STEP)
        const pc = toDec(PC_DATA)
        const out = toDec(OUT_DATA)
        
        console.log(`Cycle: ${cycles}, Step: ${step}, PC: ${pc}, Output: ${out}`)
        
        // Check if HALT is active
        if (HALT.get()) {
            console.log("Program halted!")
            halted = true
        }
        
        cycles++
    }

    if (!halted) {
        console.log("Maximum cycles reached without halting.")
    }

    console.log(`\nFinal output value: ${toDec(OUT_DATA)}`)
}
