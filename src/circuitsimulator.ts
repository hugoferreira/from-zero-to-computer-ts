import { Simulator } from './simulator'

// -----------

const fromBin = (n: number, width: number): boolean[] => Array(width).fill(0).map((_, ix) => (n >> ix & 1) === 1)

export const toDec = (bs: boolean | boolean[] | Bus | Wire): number => {
    if (typeof bs === 'boolean') return (bs ? 1 : 0)
    if (bs instanceof Wire) return (bs.getSignal() ? 1 : 0)
    if (bs instanceof Bus) bs = bs.getSignal()
    return bs.reduce((a, b, p) => a + ((b ? 1 : 0) << p), 0)
}

// -----------

export const toHex = (bs: boolean[] | Bus, width: number = bs.length / 4): string => `0x${toDec(bs).toString(16).padStart(width, '0')}`
export const toBin = (bs: boolean[] | Bus, width: number = bs.length): string => `0b${toDec(bs).toString(2).padStart(width, '0')}`

// -----------

// [FIXME] Optimization: the parameter should be a wire, 
// as it would solve multiple setSignals in Buses 
type CircuitAction = () => void 

interface Connector<T> {
    length: number
    getSignal(): T
    setSignal(s: T): void
    trigger(a: CircuitAction): void
    clone(): Connector<T> 
}

export class Wire implements Connector<boolean> {
    length = 1

    private _actions = new Array<CircuitAction>()
    private _posEdge = new Array<CircuitAction>()

    constructor(private _signal: boolean = false) { }

    clone() { return new Wire }

    getSignal() { return this._signal }
    setSignal(s: boolean) {
        if (s !== this._signal) {
            this._signal = s
            this._actions.forEach(a => a())
            if (s) this._posEdge.forEach(a => a())
        }
    }

    on() { this.setSignal(true) }
    off() { this.setSignal(false) }

    trigger(a: CircuitAction) { this._actions.push(a); a() }
    posEdge(a: CircuitAction) { this._posEdge.push(a); if (this._signal) a() }
}

export const High = new class extends Wire {
    getSignal() { return true }
    setSignal(s: boolean) { }
    clone() { return this }
}

export const Low = new class extends Wire {
    getSignal() { return false }
    setSignal(s: boolean) { }
    clone() { return this }
}

export class Bus extends Array<Wire> implements Connector<boolean[]> {
    constructor(public wires: Wire[]) { super(...wires) }

    clone(): Bus { return new Bus(this.wires.map(w => w.clone())) }

    getSignal() { return this.wires.map(w => w.getSignal()) }
    setSignal(signals: boolean[] | number) {
        if (typeof signals === 'number') signals = fromBin(signals, this.wires.length)
        signals.forEach((s, ix) => this.wires[ix].setSignal(s))
    }

    trigger(a: CircuitAction) { this.wires.forEach(w => w.trigger(a)) }

    slice(start?: number | undefined, end?: number | undefined): Wire[] { 
        return this.wires.slice(start, end) 
    }
}

export class CircuitSimulator extends Simulator<CircuitAction> {
    private readonly _ffDelay = 0
    private readonly _dffDelay = 0
    private readonly _gateDelay = 0

    bus(size: number, initSignal: number = 0) {
        const bus = new Bus(Array(size).fill(0).map(_ => new Wire))
        bus.setSignal(initSignal)
        return bus
    }

    posedge(w: Wire) {
        const lastTick = this.tick;
        do { this.forward() } while (!w.getSignal() || lastTick === this.tick);
        return this.tick
    }

    negedge(w: Wire) {
        const lastTick = this.tick;
        do { this.forward() } while (w.getSignal() || lastTick === this.tick);
        return this.tick
    }

    connect<T, U extends Connector<T>>(from: U, to: U, delay: number = 0) {
        from.trigger(() => {
            const sig = from.getSignal()
            this.schedule(() => to.setSignal(sig), delay)
        })
    }

    // ----------------------------------------------
    // Gates
    // ----------------------------------------------

    inverter(input: Wire) {
        const out = new Wire
        input.trigger(() => {
            const sig = !input.getSignal()
            this.schedule(() => out.setSignal(sig), this._gateDelay)
        })
        return out
    }

    binaryOp(a: Wire, b: Wire, op: (a: boolean, b: boolean) => boolean) {
        const out = new Wire
        const action = () => {
            const sig = op(a.getSignal(), b.getSignal())
            this.schedule(() => out.setSignal(sig), this._gateDelay)
        }

        a.trigger(action)
        b.trigger(action)

        return out
    }

    and(a: Wire, b: Wire) { return this.binaryOp(a, b, (x, y) => x && y) }
    nand(a: Wire, b: Wire) { return this.binaryOp(a, b, (x, y) => !(x && y)) }
    or(a: Wire, b: Wire) { return this.binaryOp(a, b, (x, y) => x || y) }
    nor(a: Wire, b: Wire) { return this.binaryOp(a, b, (x, y) => !(x || y)) }
    xor(a: Wire, b: Wire) { return this.binaryOp(a, b, (x, y) => x ? (!y) : y) }

    // [TODO] Not sure about a posedge here...
    buffer<T, U extends Connector<T>>(ins: U, we: Wire = High, outs = <U> ins.clone()) {
        const action = () => {
            if (we.getSignal()) {
                const sig = ins.getSignal()
                this.schedule(() => outs.setSignal(sig), this._gateDelay)
            }
        }

        ins.trigger(action)
        we.posEdge(action)

        return outs
    }

    // ----------------------------------------------
    // Memory
    // ----------------------------------------------

    // SR NOR Latch
    // [TODO] Not working; simulation doesn't stabilize
    flipflop(set: Wire, reset: Wire) {
        const out = new Wire
        const nq = new Wire

        this.connect(this.nor(set, nq), out, 1)
        this.connect(this.nor(reset, out), nq, 1)

        return out
    }

    // SR Latch { Optimized }
    ff(set: Wire, reset: Wire, state: boolean = false) {
        const out = new Wire

        const action = () => {
            const s = set.getSignal()
            const r = reset.getSignal()
            this.schedule(() => { state = s || (state && !r); out.setSignal(state) }, this._ffDelay)
        }

        set.trigger(action)
        reset.trigger(action)

        return out
    }

    rom(address: Bus, mem: number[], data: Bus) {
        address.trigger(() => data.setSignal(mem[toDec(address.getSignal())]))
    }

    // ----------------------------------------------
    // Plexers
    // ----------------------------------------------

    // Single Bit Data/Sel Multiplexer 
    onebitmux(a: Wire, b: Wire, s: Wire): Wire {
        return this.or(this.and(a, this.inverter(s)), this.and(b, s))
    }
        
    // Multiplexer { Optimized }
    mux<U extends Bus | Wire>(data: Array<U>, sel: Bus | Wire, out = <U> data[0].clone()): U {
        if (data.length !== 2 ** sel.length)
            throw new Error("Selection and data lines size mismatch")

        const wes = this.bus(data.length)
        data.forEach((i, ix) => this.buffer(i, wes[ix], out))
        this.decoder(sel, wes)

        return out
    }

    decoder(data: Bus | Wire, outs: Bus = this.bus(2 ** data.length)): Bus {
        data.trigger(() => {
            const six = toDec(data.getSignal())

            // [FIXME] Javascript doesn't has precision to represent this as it should:
            // this.schedule(() => outs.setSignal(1 << six))
            // Maybe change to this later when I have SHL circuits or BigInts

            this.schedule(() => outs.forEach((w, ix) => w.setSignal(ix === six)))
        })

        return outs
    }

    // ----------------------------------------------
    // Sequential Logic (Arithmetic)
    // ----------------------------------------------

    incrementer(a: Bus, outs = a.clone()): [Bus, Wire] {
        const cout = a.reduce((cin, w, ix) => {
            this.connect(this.xor(w, cin), outs[ix])
            return this.and(w, cin)
        }, High)

        return [outs, cout]
    }

    fulladder(a: Bus, b: Bus, carry: Wire, outs = a.clone()): [Bus, Wire] {
        const cout = a.reduce((cin, w, ix) => {
            const x = this.xor(w, b[ix])
            this.connect(this.xor(x, cin), outs[ix])
            return this.or(this.and(x, cin), this.and(w, b[ix]))
        }, carry)

        return [outs, cout]
    }

    // ----------------------------------------------
    // Sequential Logic
    // ----------------------------------------------

    clock(interval: number = 1, initSignal: boolean = false) {
        const out = new Wire
        out.setSignal(initSignal)

        const ticktack = () => {
            const sig = !out.getSignal()
            this.schedule(() => { out.setSignal(sig); ticktack() }, interval)
        }

        ticktack()
        return out
    }

    // PosEdge D Flip-Flop { Optimized, Workaround flipflop non-stabilization }
    dff(input: Wire, clk: Wire, initState: boolean = false, reset: Wire = Low) {
        const out = new Wire
        let state = initState

        clk.posEdge(() => {
            const sig = input.getSignal()
            const rst = reset.getSignal()
            this.schedule(() => { state = rst ? initState : sig; out.setSignal(state) }, this._dffDelay)
        })

        reset.posEdge(() => {
            this.schedule(() => { state = initState; out.setSignal(state) }, this._dffDelay)
        })

        return out
    }

    register(ins: Bus, clk: Wire, we: Wire = High, reset: Wire = Low) {
        return new Bus(ins.wires.map(w => this.dff(w, this.and(we, clk), false, reset)))
    }

    counter(data: Bus, clk: Wire, we: Wire = Low, reset: Wire, out: Bus = data.clone()): Bus {
        const innerData = this.buffer(data, we)
        const r_out = this.register(innerData, clk, High, reset)
        this.incrementer(r_out, innerData)
        this.connect(r_out, out)
        return out
    }

    ram(address: Bus, clk: Wire, data: Bus = this.bus(8), baseAddr = 0, contents: number[] = [], we: Wire = new Wire, oe: Wire = new Wire): [Bus, Wire, Wire] {
        const mem = Array(2 ** address.length).fill(0)
        contents.forEach((v, ix) => mem[ix + baseAddr] = v)

        clk.posEdge(() => {
            if (oe.getSignal()) {
                data.setSignal(mem[toDec(address.getSignal())])
            } else if (we.getSignal()) {
                mem[toDec(address.getSignal())] = toDec(data.getSignal())
            }
        })

        return [data, we, oe]
    }
}