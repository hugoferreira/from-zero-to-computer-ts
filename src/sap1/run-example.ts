import { SAP1, buildMicrocode, microcodeTable, CTL } from './sap-1';
import { subtractExample, counterExample, loopExample, addExample, memoryExample, haltExample } from './examples';
import { toDec, Bus } from '../circuitsimulator';

// Create a SAP-1 computer
const runProgram = (program: Uint8Array, maxCycles = 100) => {
    console.log("Running SAP-1 program...");
    
    const s = new SAP1();
    const clk = s.clock(1, false);
    const reset = s.wire();
    const ram = new Uint8Array(256);
    
    // Initialize microcode and load program
    const microcode = buildMicrocode(microcodeTable);
    const computer = s.build(clk, reset, microcode, ram);
    const { DBUS, PC_DATA, STEP, CTRL, OUT_DATA, HALT, clockGate, IR_DATA, OPCODE } = computer;
    
    // Load the program
    s.load(ram, program);
    
    // Print the program in memory
    console.log("Program in memory:");
    for (let i = 0; i < program.length; i++) {
        console.log(`[${i}]: ${ram[i].toString(2).padStart(8, '0')} (${ram[i]})`);
    }
    console.log("\nExecution:");
    
    // Execute the program
    let cycles = 0;
    let halted = false;
    
    // Advance the simulation a bit to initialize
    s.forward();
    
    while (cycles < maxCycles && !halted) {
        // Get current state before advancing
        const step = toDec(STEP);
        const pc = toDec(PC_DATA);
        const out = toDec(OUT_DATA);
        const opcode = toDec(OPCODE);
        const ctrlValue = toDec(CTRL);
        const haltSignal = (ctrlValue & CTL.HALT) !== 0;

        // Debug output
        console.log(`Cycle: ${cycles}, Step: ${step}, PC: ${pc}, IR: ${opcode}, Output: ${out}, HALT: ${haltSignal ? 'YES' : 'no'}`);
        
        // Process simulation step using the clockGate (which respects HALT)
        if (haltSignal) {
            console.log("HALT signal detected, stopping execution");
            halted = true;
        } else {
            // Only advance the clock if not halted
            s.posedge(clk);
        }
        
        cycles++;
    }
    
    if (!halted) {
        console.log("Maximum cycles reached without halting.");
    }
    
    console.log(`\nFinal output value: ${toDec(OUT_DATA)}`);
};

// Run the halt program
console.log("=== Running Halt Example ===");
runProgram(haltExample);

// Run the subtract example
console.log("\n=== Running Subtraction Example ===");
runProgram(subtractExample);

// Run the add example
console.log("\n=== Running Add Example ===");
runProgram(addExample);

// Run the counter example
console.log("\n=== Running Counter Example ===");
runProgram(counterExample, 50);

// Run the memory example
console.log("\n=== Running Memory Example ===");
runProgram(memoryExample);

// Run the loop example with limited cycles
console.log("\n=== Running Loop Example (Limited to 30 cycles) ===");
runProgram(loopExample, 30); 