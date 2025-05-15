import { 
    asm, MVI_A, MVI_B, MVI_C, 
    MOV_AB, MOV_AC, MOV_BA, MOV_BC, MOV_CA, MOV_CB,
    ADD_B, ADD_C, SUB_B, SUB_C,
    ANA_B, ORA_B, XRA_B,
    INR_A, INR_B, INR_C, DCR_A, DCR_B, DCR_C,
    JMP, JZ, JNZ,
    OUT, HLT, NOP, CALL, RET,
    LABEL, DATA,
    REPEAT, IF_ZERO, IF_NOT_ZERO
} from './assembler';

// Example 1: Simple arithmetic operations
export const arithmeticExample = asm(
    MVI_A(10),      // Load value 10 into A
    MVI_B(3),       // Load value 3 into B
    ADD_B(),        // A = A + B (result: 13)
    MOV_BC(),       // Copy B to C
    MVI_B(5),       // Load value 5 into B
    SUB_B(),        // A = A - B (result: 8)
    OUT(0x03),      // Output the result to port 3
    HLT()           // Halt the CPU
);

// Example 2: Register operations
export const registerExample = asm(
    MVI_A(25),      // Load 25 into A
    MOV_AB(),       // Copy A to B (B = 25)
    MVI_A(10),      // Load 10 into A
    MOV_AC(),       // Copy A to C (C = 10)
    MOV_BA(),       // Copy B to A (A = 25)
    ADD_C(),        // A = A + C (A = 25 + 10 = 35)
    OUT(0x03),      // Output A to port 3
    HLT()           // Halt
);

// Example 3: Logical operations
export const logicalExample = asm(
    MVI_A(0xF0),    // Load 11110000 into A
    MVI_B(0x0F),    // Load 00001111 into B
    ANA_B(),        // A = A AND B (result: 00000000)
    OUT(0x03),      // Output the result
    
    MVI_A(0xF0),    // Load 11110000 into A
    MVI_B(0x0F),    // Load 00001111 into B
    ORA_B(),        // A = A OR B (result: 11111111)
    OUT(0x03),      // Output the result
    
    MVI_A(0xAA),    // Load 10101010 into A
    MVI_B(0x55),    // Load 01010101 into B
    XRA_B(),        // A = A XOR B (result: 11111111)
    OUT(0x03),      // Output the result
    
    HLT()           // Halt
);

// Example 4: Counter with conditional jumps
export const counterExample = asm(
    MVI_A(1),       // Initialize counter to 1
    MVI_C(10),      // Set maximum count to 10
    
    LABEL('loop'),
    OUT(0x03),      // Output current count
    
    // Compare A with C
    MOV_BA(),       // Copy A to B
    MOV_AC(),       // Copy C to A (A = 10)
    SUB_B(),        // A = A - B (A = 10 - counter)
    JZ('end'),      // If counter == 10, jump to end
    
    MOV_BA(),       // Restore counter to A
    INR_A(),        // Increment counter
    JMP('loop'),    // Jump back to loop
    
    LABEL('end'),
    OUT(0x03),      // Output final value
    HLT()           // Halt
);

// Example 5: Subroutine example
export const subroutineExample = asm(
    MVI_A(5),       // Initialize A with 5
    CALL('square'), // Call square subroutine
    OUT(0x03),      // Output result (25)
    
    MVI_A(10),      // Initialize A with 10
    CALL('square'), // Call square subroutine
    OUT(0x03),      // Output result (100)
    
    HLT(),          // Halt
    
    // Square subroutine (A = A * A)
    LABEL('square'),
    MOV_BC(),       // Save A in C
    MOV_BA(),       // Copy A to B
    MVI_A(0),       // Clear A for accumulation
    
    LABEL('multiply_loop'),
    ADD_C(),        // Add C to A
    DCR_B(),        // Decrement B
    JNZ('multiply_loop'), // Loop until B is zero
    
    RET()           // Return from subroutine
);

// Example 6: Memory copy example
export const memoryExample = asm(
    // Initialize memory locations
    DATA(10),       // Address 0: Value to copy
    DATA(20),       // Address 1: Another value
    DATA(30),       // Address 2: Another value
    DATA(0),        // Address 3: Copy destination for value 1
    DATA(0),        // Address 4: Copy destination for value 2
    DATA(0),        // Address 5: Copy destination for value 3
    
    // Set up memory pointers
    MVI_B(0),       // Source pointer
    MVI_C(3),       // Destination pointer
    
    // Copy first value
    MOV_AB(),       // B contains source address
    MOV_BA(),       // Get data from address 0
    MOV_AC(),       // C contains destination
    MOV_CA(),       // Store data to destination
    
    // Copy second value
    INR_B(),        // Increment source to address 1
    INR_C(),        // Increment destination to address 4
    MOV_AB(),
    MOV_BA(),
    MOV_AC(),
    MOV_CA(),
    
    // Copy third value
    INR_B(),
    INR_C(),
    MOV_AB(),
    MOV_BA(),
    MOV_AC(),
    MOV_CA(),
    
    HLT()           // Halt
);

// Example 7: Simple halt example
export const haltExample = asm(
    HLT()           // Just halt immediately
); 