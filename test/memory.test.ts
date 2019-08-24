import { expect } from "chai";
import { CircuitSimulator, Wire, toDec } from '../src/circuitsimulator'

describe('ram', () => {
    it('work as expected', () => {
        const s = new CircuitSimulator()

        const CLK = s.clock(1)
        const abus = s.bus(8)
        const dbus = s.bus(8)

        const { we: RAM_IN, oe: RAM_OUT } = s.ioram(abus, CLK, dbus, new Uint8Array(0x100))

        abus.set(0x00)
        s.posedge(CLK)
        expect(toDec(dbus)).eq(0x00)

        RAM_IN.on()
        abus.set(0x00)
        dbus.set(0x10)
        s.posedge(CLK)  

        abus.set(0x01)
        dbus.set(0x20)
        s.posedge(CLK)  

        RAM_IN.off()
        RAM_OUT.on()
        abus.set(0x00)
        s.posedge(CLK)  
        expect(toDec(dbus)).eq(0x10)

        abus.set(0x01)
        s.posedge(CLK)  
        expect(toDec(dbus)).eq(0x20)

        abus.set(0x02)
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
            abus.set(ix)
            expect(toDec(dbus)).eq(v)
        })
    })
})