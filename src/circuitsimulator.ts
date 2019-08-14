import { Simulator } from './simulator'

// -----------

const fromBin = (n: number, width: number): Boolean[] => Array(width).fill(0).map((_, ix) => (n >> ix & 1) === 1)

export const toDec = (bs: Boolean[] | Bus | Wire): number => {
    if (bs instanceof Bus) bs = bs.getSignal()
    if (bs instanceof Wire) return (bs.getSignal() ? 1 : 0)
    return bs.reduce((a, b, p) => a + ((b ? 1 : 0) << p), 0)
}

// -----------

export const toHex = (bs: Boolean[] | Bus, width: number = bs.length / 4): string => `0x${toDec(bs).toString(16).padStart(width, '0')}`
export const toBin = (bs: Boolean[] | Bus, width: number = bs.length): string => `0b${toDec(bs).toString(2).padStart(width, '0')}`

// -----------

type CircuitAction = () => void

interface Connector<T> {
    getSignal(): T
    setSignal(s: T): void
    trigger(a: CircuitAction): void
}

export class Wire implements Connector<Boolean> {
    private _actions = new Array<CircuitAction>()
    private _posEdge = new Array<CircuitAction>()

    constructor(private _signal: Boolean = false) { }

    getSignal() { return this._signal }
    setSignal(s: Boolean) {
        if (s !== this._signal) {
            this._signal = s
            this._actions.forEach(a => a())
            if (s) this._posEdge.forEach(a => a())
        }
    }

    on() { this.setSignal(true) }
    off() { this.setSignal(false) }

    trigger(a: CircuitAction) { this._actions.push(a) }
    posEdge(a: CircuitAction) { this._posEdge.push(a) }
}

export const High = new class extends Wire {
    getSignal() { return true }
    setSignal(s: Boolean) { }
    trigger(a: CircuitAction) { a() }
    posEdge(a: CircuitAction) { a() }
}

export const Low = new class extends Wire {
    getSignal() { return false }
    setSignal(s: Boolean) { }
    trigger(a: CircuitAction) { a() }
    posEdge(a: CircuitAction) { }
}

export class Bus extends Array<Wire> implements Connector<Boolean[]> {
    private _actions = new Array<CircuitAction>()

    constructor(public wires: Wire[]) { super(...wires) }

    getSignal() { return this.wires.map(w => w.getSignal()) }
    setSignal(signals: Boolean[] | number) {
        if (typeof signals === 'number') signals = fromBin(signals, this.wires.length)
        signals.forEach((s, ix) => this.wires[ix].setSignal(s))
        this._actions.forEach(a => a())
    }

    trigger(a: CircuitAction) { this._actions.push(a) }
}

export class CircuitSimulator extends Simulator<CircuitAction> {
    private readonly _ffDelay = 0
    private readonly _dffDelay = 0
    private readonly _gateDelay = 0

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

    connect<T>(from: Connector<T>, to: Connector<T>, delay: number = 0) {
        from.trigger(() => {
            const sig = from.getSignal()
            this.schedule(() => to.setSignal(sig), delay)
        })
    }

    inverter(input: Wire) {
        const out = new Wire
        input.trigger(() => {
            const sig = !input.getSignal()
            this.schedule(() => out.setSignal(sig), this._gateDelay)
        })
        return out
    }

    binaryOp(a: Wire, b: Wire, op: (a: Boolean, b: Boolean) => Boolean) {
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

    clock(interval: number = 1, initSignal: Boolean = false) {
        const out = new Wire
        out.setSignal(initSignal)

        const ticktack = () => {
            const sig = !out.getSignal()
            this.schedule(() => { out.setSignal(sig); ticktack() }, interval)
        }

        ticktack()
        return out
    }

    // SR NOR Latch: This is not working, because the simulator doesn't stabilize
    flipflop(set: Wire, reset: Wire) {
        const out = new Wire
        const nq = new Wire

        this.connect(this.nor(set, nq), out, 1)
        this.connect(this.nor(reset, out), nq, 1)

        return out
    }

    // SR Latch { Optimized }
    ff(set: Wire, reset: Wire, state: Boolean = false) {
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

    // PosEdge D Flip-Flop { Optimized }
    dff(input: Wire, clk: Wire, state: Boolean = false) {
        const out = new Wire

        clk.posEdge(() => {
            const sig = input.getSignal()
            this.schedule(() => { state = sig; out.setSignal(state) }, this._dffDelay)
        })

        return out
    }

    dffs(input: Bus, clk: Wire, we: Wire = High) {
        return input.wires.map(w => this.dff(w, this.and(we, clk)))
    }

    register(ins: Bus, clk: Wire, we: Wire = High) {
        return new Bus(this.dffs(ins, this.and(we, clk)))
    }

    bus(size: number) {
        return new Bus(Array(size).fill(0).map(_ => new Wire))
    }

    buffer(ins: Bus, we: Wire = High, outs: Bus = this.bus(ins.length)) {
        we.posEdge(() => {
            const sig = ins.getSignal()
            this.schedule(() => outs.setSignal(sig), this._gateDelay)
        })

        return outs
    }

    incrementer(a: Bus, outs = this.bus(a.length)): [Bus, Wire] {
        const cout = a.reduce((cin, w, ix) => {
            this.connect(this.xor(w, cin), outs[ix])
            return this.and(w, cin)
        }, High)

        return [outs, cout]
    }

    fulladder(a: Bus, b: Bus, carry: Wire, outs = this.bus(a.length)): [Bus, Wire] {
        const cout = a.reduce((cin, w, ix) => {
            const x = this.xor(w, b[ix])
            this.connect(this.xor(x, cin), outs[ix])
            return this.or(this.and(x, cin), this.and(w, b[ix]))
        }, carry)

        return [outs, cout]
    }
}