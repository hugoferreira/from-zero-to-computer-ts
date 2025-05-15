import { expect } from "chai";
import { CircuitSimulator, toDec } from '../src/circuitsimulator'

describe('bus, registers and adder', () => {
    it('should do stuff', () => {
        const s = new CircuitSimulator()

        const CLK = s.clock(10)
        const DBUS = s.bus(8)

        const A_IN = s.wire()
        const B_IN = s.wire()
        const A_DATA = s.register(DBUS, CLK, A_IN)
        const B_DATA = s.register(DBUS, CLK, B_IN)

        const A_OUT = s.wire()
        const B_OUT = s.wire()
        s.buffer(A_DATA.out, A_OUT, DBUS)
        s.buffer(B_DATA.out, B_OUT, DBUS)

        const CF_IN = s.wire()
        const [SUM_DATA, CF_OUT] = s.fulladder(A_DATA.out, B_DATA.out, CF_IN)

        expect(s.posedge(CLK)).eq(10)

        DBUS.set(0b1001)

        expect(s.posedge(CLK)).eq(30) 
        expect(toDec(A_DATA.out)).eq(0)
        expect(toDec(B_DATA.out)).eq(0)

        B_IN.on()

        expect(s.posedge(CLK)).eq(50)
        expect(toDec(A_DATA.out)).eq(0)         
        expect(toDec(B_DATA.out)).eq(0b1001)    

        B_IN.off()
        DBUS.set(0x0000)
        A_IN.on()
        B_OUT.on()      // override data on DBUS

        expect(s.posedge(CLK)).eq(70)
        expect(toDec(DBUS)).eq(0b1001) 
        expect(toDec(A_DATA.out)).eq(0b1001) 
        expect(toDec(B_DATA.out)).eq(0b1001) 

        B_OUT.off()
        DBUS[2].on()    // Slice and set wire
        expect(B_IN.get()).false
        expect(A_IN.get()).true

        expect(s.posedge(CLK)).eq(90)
        expect(toDec(A_DATA.out)).eq(0x0d) 
        expect(toDec(B_DATA.out)).eq(0x09) 
        expect(toDec(SUM_DATA)).eq(0x16) 
        expect(CF_OUT.get()).false
    })
})