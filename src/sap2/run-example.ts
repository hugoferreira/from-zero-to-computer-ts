import { SAP2, buildMicrocode, microcodeTable, CTL } from './sap-2';
import { 
    arithmeticExample, 
    registerExample, 
    logicalExample, 
    counterExample, 
    subroutineExample, 
    memoryExample, 
    haltExample 
} from './examples';
import { toDec, Bus } from '../circuitsimulator';

// Create a SAP-2 computer
const runProgram = (program: Uint8Array, maxCycles = 200): void => {
    console.log("Running SAP-2 program...");
    
    const s = new SAP2();
    const clk = s.clock(1, false);
    const reset = s.wire();
    const ram = new Uint8Array(65536); // 64K memory
    
    // Initialize microcode and load program
    const microcode = buildMicrocode(microcodeTable);
    const computer = s.build(clk, reset, microcode, ram);
    const { 
        WBUS, PC_DATA, STEP, CTRL, OUT3_DATA, HALT, clockGate, IR_DATA, OPCODE,
        A_DATA, B_DATA, C_DATA, FLAGS_DATA
    } = computer;
    
    // Load the program
    s.load(ram, program);
    
    // Print the program in memory
    console.log("Program in memory:");
    for (let i = 0; i < program.length; i++) {
        console.log(`[${i}]: ${ram[i].toString(16).padStart(2, '0')} (${ram[i]})`);
    }
    // @ts-ignore
    if (globalThis.enableDetailedLogging) console.log("Execution:");
    
    // Execute the program
    let cycles = 0;
    let halted = false;
    
    // Advance the simulation a bit to initialize
    s.forward();
    
    while (cycles < maxCycles && !halted) {
        // Get current state before advancing
        const step = toDec(STEP);
        const pc = toDec(PC_DATA);
        const a = toDec(A_DATA);
        const b = toDec(B_DATA);
        const c = toDec(C_DATA);
        const flags = toDec(FLAGS_DATA);
        const out = toDec(OUT3_DATA);
        const opcode = toDec(OPCODE);
        const ctrlValue = toDec(CTRL);
        const haltSignal = (ctrlValue & CTL.HALT) !== 0;

        // Debug output
        // @ts-ignore
        if (globalThis.enableDetailedLogging) console.log(`Cycle: ${cycles}, Step: ${step}, PC: 0x${pc.toString(16)}, IR: 0x${opcode.toString(16)}, A: ${a}, B: ${b}, C: ${c}, Flags: ${flags}, Output: ${out}, HALT: ${haltSignal ? 'YES' : 'no'}`);
        
        // Process simulation step using the clockGate (which respects HALT)
        if (haltSignal) {
            // @ts-ignore
            if (globalThis.enableDetailedLogging) console.log("HALT signal detected, stopping execution");
            halted = true;
        } else {
            // Only advance the clock if not halted
            s.posedge(clk);
        }
        
        cycles++;
    }
    
    if (!halted) {
        // @ts-ignore
        if (globalThis.enableDetailedLogging) console.log("Maximum cycles reached without halting.");
    }
    
    console.log(`\nFinal values:`);
    console.log(`A: ${toDec(A_DATA)}, B: ${toDec(B_DATA)}, C: ${toDec(C_DATA)}, Flags: ${toDec(FLAGS_DATA)}`);
    console.log(`Output: ${toDec(OUT3_DATA)}`);
};

// Run the halt example
console.log("=== Running Halt Example ===");
runProgram(haltExample);

// Run the arithmetic example
console.log("\n=== Running Arithmetic Example ===");
runProgram(arithmeticExample);

// Run the register operations example
console.log("\n=== Running Register Example ===");
runProgram(registerExample);

// Run the logical operations example
console.log("\n=== Running Logical Operations Example ===");
runProgram(logicalExample);

// Run the counter example with more cycles
console.log("\n=== Running Counter Example ===");
runProgram(counterExample, 300);

// Run the subroutine example
console.log("\n=== Running Subroutine Example ===");
runProgram(subroutineExample, 400);

// Run the memory example
console.log("\n=== Running Memory Example ===");
runProgram(memoryExample, 400); 