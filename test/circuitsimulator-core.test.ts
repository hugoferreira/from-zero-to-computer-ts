import { expect } from "chai";
import { CircuitSimulator, Wire, Bus, toDec } from '../src/circuitsimulator';
import 'mocha';

describe('CircuitSimulator Core Logic', () => {

    it('should correctly latch data in a register with synchronous WE using two-phase commit', () => {
        const sim = new CircuitSimulator();
        const CLK = sim.clock(1, false); // Clock with interval 1, starts low
        const D_IN_WIRE = sim.wire(false);
        const WE_WIRE = sim.wire(false);
        
        const D_IN_BUS = new Bus([D_IN_WIRE]);
        const register_Q_BUS = sim.register(D_IN_BUS, CLK, WE_WIRE, sim.Low); // 1-bit register

        // Initial state: D_IN=0, WE=0, Q=0
        sim.forward(); // Propagate initial states if any (onChange calls)
        expect(toDec(register_Q_BUS.out)).to.equal(0, "Initial Q should be 0");

        // Cycle 1: WE=0, D_IN=1. Q should remain 0 after clock edge.
        D_IN_WIRE.set(true); // D_IN is now 1
        sim.forward(); // Process D_IN change
        
        console.log(`Tick ${sim.tick}: Before C1 posedge. D_IN=${D_IN_WIRE.get()}, WE=${WE_WIRE.get()}, Q=${toDec(register_Q_BUS.out)}`);
        sim.posedge(CLK); // Clock edge 
        // flushObserverCalls (part of sim.do() called by posedge) should have run.
        // Register output (Q) updates after _ffDelay (0), so it should be readable.
        console.log(`Tick ${sim.tick}: After C1 posedge. D_IN=${D_IN_WIRE.get()}, WE=${WE_WIRE.get()}, Q=${toDec(register_Q_BUS.out)}`);
        expect(toDec(register_Q_BUS.out)).to.equal(0, "Q should still be 0 because WE was low");

        // Cycle 2: Set WE=1 (schedule for current tick). D_IN is still 1.
        // Q should become 1 after this clock edge. This is the critical test.
        WE_WIRE.set(true); // WE is now 1. This schedules an event for current tick.
                           // sim.do() is not explicitly called here, relying on posedge's internal calls.

        console.log(`Tick ${sim.tick}: Before C2 posedge. D_IN=${D_IN_WIRE.get()}, WE=${WE_WIRE.get()}, Q=${toDec(register_Q_BUS.out)}`);
        sim.posedge(CLK); // Clock edge. Internally calls sim.forward() -> sim.do().
                          // Phase 1 of sim.do() should execute WE_WIRE.set(true) event.
                          // Phase 2 of sim.do() should flush observers, including CLK's observer for the register.
                          // The register's clk.onChange should then see WE_WIRE.get() as true.
        console.log(`Tick ${sim.tick}: After C2 posedge. D_IN=${D_IN_WIRE.get()}, WE=${WE_WIRE.get()}, Q=${toDec(register_Q_BUS.out)}`);
        expect(toDec(register_Q_BUS.out)).to.equal(1, "Q should be 1 because WE was set high before the edge effectively latched");
        
        // Cycle 3: WE=0, D_IN=0. Q should remain 1.
        WE_WIRE.set(false);
        D_IN_WIRE.set(false);
        sim.forward(); // process D_IN and WE changes

        console.log(`Tick ${sim.tick}: Before C3 posedge. D_IN=${D_IN_WIRE.get()}, WE=${WE_WIRE.get()}, Q=${toDec(register_Q_BUS.out)}`);
        sim.posedge(CLK);
        console.log(`Tick ${sim.tick}: After C3 posedge. D_IN=${D_IN_WIRE.get()}, WE=${WE_WIRE.get()}, Q=${toDec(register_Q_BUS.out)}`);
        expect(toDec(register_Q_BUS.out)).to.equal(1, "Q should hold 1 because WE was low for this edge");
    });

    it('should latch data when WE and CLK posedge occur in the same tick (using fastRegister)', () => {
        const sim = new CircuitSimulator();
        const CLK = sim.wire(false);
        const DATA_IN = sim.bus(8);
        const WE = sim.wire(false);
        const DATA_OUT = sim.fastRegister(DATA_IN, CLK, WE); // fastRegister returns Bus

        DATA_IN.set(0xAA);
        sim.forward();
        expect(toDec(DATA_OUT.get())).to.equal(0, 'Initial output should be 0 (fastRegister)'); // Correct: DATA_OUT is a Bus

        WE.set(true);
        DATA_IN.set(0x55);
        CLK.set(true);
        sim.forward();
        expect(toDec(DATA_OUT.get())).to.equal(0x55, 'fastRegister should have latched 0x55 after WE and posedge'); // Correct: DATA_OUT is a Bus

        CLK.set(false);
        sim.forward();
        expect(toDec(DATA_OUT.get())).to.equal(0x55, 'fastRegister should still hold 0x55 after clock goes low'); // Correct: DATA_OUT is a Bus

        WE.set(false);
        DATA_IN.set(0xCC);
        CLK.set(true);
        sim.forward();
        expect(toDec(DATA_OUT.get())).to.equal(0x55, 'fastRegister should still hold 0x55 as WE was false'); // Correct: DATA_OUT is a Bus

        CLK.set(false);
        sim.forward();
        expect(toDec(DATA_OUT.get())).to.equal(0x55, 'fastRegister should still hold 0x55'); // Correct: DATA_OUT is a Bus
    });

    it('should latch data when WE and CLK posedge occur in the same tick (original register)', () => {
        const sim = new CircuitSimulator();
        const CLK = sim.wire(false); 
        const DATA_IN = sim.bus(8);    
        const WE = sim.wire(false);    
        const DATA_OUT = sim.register(DATA_IN, CLK, WE); 

        DATA_IN.set(0xAA); 
        sim.forward(); 

        expect(toDec(DATA_OUT.out.get())).to.equal(0, 'Initial output should be 0');

        WE.set(true);
        DATA_IN.set(0x55); 
        CLK.set(true); 
        sim.forward(); 

        expect(toDec(DATA_OUT.out.get())).to.equal(0x55, 'Register should have latched 0x55 after WE and posedge');

        CLK.set(false);
        sim.forward();
        expect(toDec(DATA_OUT.out.get())).to.equal(0x55, 'Register should still hold 0x55 after clock goes low');

        WE.set(false);
        DATA_IN.set(0xCC); 
        CLK.set(true); 
        sim.forward();

        expect(toDec(DATA_OUT.out.get())).to.equal(0x55, 'Register should still hold 0x55 as WE was false');

        CLK.set(false);
        sim.forward();
        expect(toDec(DATA_OUT.out.get())).to.equal(0x55, 'Register should still hold 0x55');
    });
}); 