import { expect } from "chai";
import { CircuitSimulator, Wire, toDec } from '../src/circuitsimulator'

describe('ram', () => {
    it('work as expected', () => {
        const s = new CircuitSimulator()

        const CLK = s.clock(1)
        const abus = s.bus(8)
        const dbus = s.bus(8)
        const RAM_IN = new Wire
        const RAM_OUT = new Wire

        s.ram(abus, CLK, dbus, 0, [], RAM_IN, RAM_OUT)

        abus.setSignal(0x00)
        s.posedge(CLK)
        expect(toDec(dbus)).eq(0x00)

        RAM_IN.on()
        abus.setSignal(0x00)
        dbus.setSignal(0x10)
        s.posedge(CLK)  

        abus.setSignal(0x01)
        dbus.setSignal(0x20)
        s.posedge(CLK)  

        RAM_IN.off()
        RAM_OUT.on()
        abus.setSignal(0x00)
        s.posedge(CLK)  
        expect(toDec(dbus)).eq(0x10)

        abus.setSignal(0x01)
        s.posedge(CLK)  
        expect(toDec(dbus)).eq(0x20)

        abus.setSignal(0x02)
        s.posedge(CLK)  
        expect(toDec(dbus)).eq(0x00)
    })
})

describe('rom', () => {
    it('work as expected', () => {
        const s = new CircuitSimulator()

        const abus = s.bus(8)
        const dbus = s.bus(8)
        const mem = [0x01, 0x1C, 0x08, 0x1B, 0x01, 0x00, 0x02, 0x02, 0x10]

        s.rom(abus, mem, dbus)
        s.do()

        mem.forEach((v, ix) => {
            abus.setSignal(ix)
            expect(toDec(dbus)).eq(v)
        })
    })
})