import { asm, LDA, LDB, ADD, SUB, OUT, HLT, STA, JMP, LABEL, DATA } from './assembler';

// Example 1: Simple subtraction, output and halt
export const subtractExample = asm(
    LDA(10),       // Load value 10 into A
    LDB(3),        // Load value 3 into B
    SUB(),         // A = A - B (result: 7)
    OUT(),         // Output the result
    HLT()          // Halt the CPU
);

// Example 2: Counter that counts from 1 to 10 (using JMP as a loop with no condition)
export const counterExample = asm(
    LDA(1),        // Start counter at 1
    LABEL('loop'),
    OUT(),         // Output current value
    LDB(1),        // Load 1 into B
    ADD(),         // Increment A by 1
    LDB(11),       // Compare with end value+1 (no actual comparison happens)
    JMP('end'),    // Always jump to end (will only execute once)
    LABEL('end'),
    HLT()          // Halt execution
);

// Example 3: Loop demonstration
// This just demonstrates the basic loop mechanism in SAP-1
// It doesn't actually do any comparison - it will just loop
// until we reach our maximum execution cycles
export const loopExample = asm(
    LDA(0),        // Initialize A to 0
    LABEL('loop'),
    OUT(),         // Output current value
    LDB(1),        // Load 1 into B
    ADD(),         // Increment A by 1
    JMP('loop'),   // Jump back to loop (infinite loop)
    HLT()          // This will never be reached
);

// Example 4: Simple fixed addition
export const addExample = asm(
    LDA(5),        // Load first number (5)
    LDB(3),        // Load second number (3)
    ADD(),         // Add them: A = A + B (result: 8)
    OUT(),         // Output the result
    HLT()          // Halt the CPU
);

// Example 5: Memory usage example
export const memoryExample = asm(
    DATA(42),      // Store 42 at address 0
    
    LDA(0),        // Load the address 0
    LDB(0),        // Load the value at that address (42)
    OUT(),         // Output 42
    
    LDA(100),      // Load a new value (100)
    STA(10),       // Store it at memory location 10
    
    LDA(10),       // Load address 10
    LDB(10),       // Load value from that address (100)
    OUT(),         // Output 100
    
    HLT()          // Halt
);

// Example 6: Simple Halt - just halts immediately
export const haltExample = asm(
    HLT()           // Just halt immediately
); 