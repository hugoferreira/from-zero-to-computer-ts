import * as c from 'colors'
import { toDec } from '../circuitsimulator'
import { SAP2, buildMicrocode, microcodeTable } from './sap-2'
import { dumpRAM, dumpRegisters } from './repl'
import { asm, unasm } from './assembler'
import { 
    arithmeticExample, 
    registerExample, 
    logicalExample, 
    counterExample, 
    subroutineExample, 
    memoryExample, 
    haltExample 
} from './examples'

// Simple command-line argument handling
const args = process.argv.slice(2)
const exampleName = args[0] || 'arithmetic' // Default to arithmetic example

// Map of available examples
const examples: Record<string, Uint8Array> = {
    'arithmetic': arithmeticExample,
    'registers': registerExample,
    'logical': logicalExample,
    'counter': counterExample,
    'subroutine': subroutineExample,
    'memory': memoryExample,
    'halt': haltExample
}

// Get the selected example program
const program = examples[exampleName] || arithmeticExample
console.log(`Running ${exampleName} example\n`)

const s = new SAP2()
const CLK = s.clock(1, false)
const RESET = s.wire()
const ram = new Uint8Array(65536) // 64K memory

const computer = s.build(CLK, RESET, buildMicrocode(microcodeTable), ram)
const { 
    MAR_DATA, STEP, PC_DATA, WBUS, OUT3_DATA, HALT, clockGate,
    A_DATA, B_DATA, C_DATA, TMP_DATA, FLAGS_DATA
} = computer

s.load(ram, program)
s.forward() // Initialize simulation

// Print the program in memory
console.log("Program in memory:")
for (let i = 0; i < program.length; i++) {
    console.log(`[${i}]: ${ram[i].toString(16).padStart(2, '0')} (${ram[i]})`)
}
console.log("\nExecution:")

const toHex = (...xs: (number | string)[]) => xs.map(x => `${x.toString(16).toUpperCase().padStart(2, '0')}`) 

// Use automatic UI update or interactive execution based on presence of --interactive flag
const isInteractive = args.includes('--interactive')

if (isInteractive) {
    // Interactive mode with UI updates
    CLK.onChange(() => {
        if (toDec(STEP) === 0) {
            console.log(`PC: ${toDec(PC_DATA)}, A: ${toDec(A_DATA)}, B: ${toDec(B_DATA)}, C: ${toDec(C_DATA)}, Flags: ${toDec(FLAGS_DATA)}`)
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
            console.log(unasm(ram.slice(pc, pc + 3)).map(op => 
                `${c.green('CODE')}\t${c.cyan(toHex(...op.code).join(' ').padEnd(7))}\t${c.green('ASM')}\t${op}`)[0])
        } catch { }
        
        if (HALT.get()) {
            console.log(c.red("\nProgram halted! Final output value:"), c.green(`${toDec(OUT3_DATA)}`))
        }
    }, 100)
} else {
    // Non-interactive automatic execution
    let cycles = 0
    let maxCycles = 1000 // Increased for more complex programs
    let halted = false

    while (cycles < maxCycles && !halted) {
        // Process simulation step
        s.posedge(clockGate) // Use the gated clock that respects HALT
        
        const step = toDec(STEP)
        const pc = toDec(PC_DATA)
        const a = toDec(A_DATA)
        const b = toDec(B_DATA)
        const c = toDec(C_DATA)
        const flags = toDec(FLAGS_DATA)
        const out = toDec(OUT3_DATA)
        
        console.log(`Cycle: ${cycles}, Step: ${step}, PC: ${pc}, A: ${a}, B: ${b}, C: ${c}, Flags: ${flags}, Output: ${out}`)
        
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

    console.log(`\nFinal values:`)
    console.log(`A: ${toDec(A_DATA)}, B: ${toDec(B_DATA)}, C: ${toDec(C_DATA)}`)
    console.log(`Flags: ${toDec(FLAGS_DATA)}`)
    console.log(`Output: ${toDec(OUT3_DATA)}`)
}
