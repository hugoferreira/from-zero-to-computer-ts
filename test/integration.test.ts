import { expect } from "chai";
import { CircuitSimulator, Wire, Low, toDec, High } from '../src/circuitsimulator'

describe('bus, registers and adder', () => {
    it('should do stuff', () => {
        const s = new CircuitSimulator()

        const CLK = s.clock(10)
        const DBUS = s.bus(8)

        const A_IN = new Wire(false)
        const B_IN = new Wire(false)
        const A_DATA = s.register(DBUS, CLK, A_IN)
        const B_DATA = s.register(DBUS, CLK, B_IN)

        const A_OUT = new Wire(false)
        const B_OUT = new Wire(false)
        s.buffer(A_DATA, A_OUT, DBUS)
        s.buffer(B_DATA, B_OUT, DBUS)

        const CF_IN = new Wire
        const [SUM_DATA, CF_OUT] = s.fulladder(A_DATA, B_DATA, CF_IN)

        expect(s.posedge(CLK)).eq(10)

        DBUS.setSignal(0b1001)

        expect(s.posedge(CLK)).eq(30) 
        expect(toDec(A_DATA)).eq(0)
        expect(toDec(B_DATA)).eq(0)

        B_IN.on()

        expect(s.posedge(CLK)).eq(50)
        expect(toDec(A_DATA)).eq(0)         
        expect(toDec(B_DATA)).eq(0b1001)    

        DBUS.setSignal(0x0000)
        B_OUT.on()      // override data on DBUS
        B_IN.off()
        A_IN.on()

        expect(s.posedge(CLK)).eq(70)
        expect(toDec(A_DATA)).eq(0b1001) 
        expect(toDec(B_DATA)).eq(0b1001) 

        B_OUT.off()
        DBUS[2].on()    // Slice and set wire
        expect(B_IN.getSignal()).false
        expect(A_IN.getSignal()).true

        expect(s.posedge(CLK)).eq(90)
        expect(toDec(A_DATA)).eq(0x0d) 
        expect(toDec(B_DATA)).eq(0x09) 
        expect(toDec(SUM_DATA)).eq(0x16) 
        expect(CF_OUT.getSignal()).false
    })
})