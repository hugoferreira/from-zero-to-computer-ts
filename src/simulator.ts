// fast-sim.ts — FastHeap (with forEach) + Simulator (with do())

/* -------------------------------------------------------------------------- */
/*                                   FastHeap                                 */
/* -------------------------------------------------------------------------- */

export class FastHeap<T> {
    private times: number[] = [];
    private seqs: number[] = [];
    private vals: T[] = [];

    private timeOffset = 0;
    private nextSeq = 0;

    constructor(
        private readonly arity = 4,
        private readonly OFFSET_LIMIT = 1e12
    ) { }

    /* ---------------- public API ---------------- */

    get length(): number { return this.times.length; }

    /** Insert event at absolute time `absTime`. */
    push(absTime: number, value: T): void {
        this.times.push(absTime - this.timeOffset);
        this.seqs.push(this.nextSeq++);
        this.vals.push(value);
        this.siftUp(this.length - 1);
    }

    /** Earliest event without removing it. */
    peek(): [number, T] | undefined {
        if (!this.length) return;
        return [this.times[0] + this.timeOffset, this.vals[0]];
    }

    /** Remove and return the earliest event. */
    pop(): [number, T] | undefined {
        if (!this.length) return;

        const absTime = this.times[0] + this.timeOffset;
        const value = this.vals[0];
        const last = this.length - 1;

        this.times[0] = this.times[last];
        this.seqs[0] = this.seqs[last];
        this.vals[0] = this.vals[last];

        this.times.pop();
        this.seqs.pop();
        this.vals.pop();

        if (this.length) this.siftDown(0);
        return [absTime, value];
    }

    /**
     * Iterate over all items (heap order).
     * Callback receives `[absoluteTime, value]`.
     */
    forEach(callback: (entry: [number, T]) => void): void {
        for (let i = 0; i < this.length; i++) {
            callback([this.times[i] + this.timeOffset, this.vals[i]]);
        }
    }

    /** O(1) bulk shift; O(n) rebuild only on overflow. */
    adjustPriorities(delta: number): void {
        this.timeOffset += delta;
        if (Math.abs(this.timeOffset) > this.OFFSET_LIMIT) {
            for (let i = 0; i < this.length; i++) this.times[i] += this.timeOffset;
            this.timeOffset = 0;
            this.buildHeap();
        }
    }

    /* ---------- heap helpers ---------- */

    private siftUp(i: number): void {
        const t = this.times, s = this.seqs, v = this.vals, ar = this.arity;
        const ti = t[i], si = s[i], vi = v[i];

        while (i > 0) {
            const p = Math.floor((i - 1) / ar);
            const tp = t[p], sp = s[p];
            if (tp < ti || (tp === ti && sp < si)) break;
            t[i] = tp; s[i] = sp; v[i] = v[p];
            i = p;
        }
        t[i] = ti; s[i] = si; v[i] = vi;
    }

    private siftDown(i: number): void {
        const t = this.times, s = this.seqs, v = this.vals,
            ar = this.arity, len = this.length;
        const ti = t[i], si = s[i], vi = v[i];

        while (true) {
            let best = i, bestT = ti, bestS = si;
            for (let k = 1; k <= ar; k++) {
                const c = ar * i + k;
                if (c >= len) break;
                const tc = t[c], sc = s[c];
                if (tc < bestT || (tc === bestT && sc < bestS)) {
                    best = c; bestT = tc; bestS = sc;
                }
            }
            if (best === i) break;
            t[i] = bestT; s[i] = bestS; v[i] = v[best];
            i = best;
        }
        t[i] = ti; s[i] = si; v[i] = vi;
    }

    private buildHeap(): void {
        const start = Math.floor(this.length / this.arity) - 1;
        for (let i = start; i >= 0; i--) this.siftDown(i);
    }
}

/* -------------------------------------------------------------------------- */
/*                                   Simulator                                */
/* -------------------------------------------------------------------------- */

export abstract class Simulator<A> {
    public tick = 0;
    protected readonly agenda: FastHeap<A>;

    constructor(arity = 4, offsetLimit = 1e12) {
        this.agenda = new FastHeap<A>(arity, offsetLimit);
    }

    /* --------- to be supplied by subclass --------- */
    protected abstract execute(action: A): void;

    /* ---------------- public API ---------------- */

    get currentTick(): number { return this.tick; }
    hasNext(): boolean { return this.agenda.length !== 0; }

    /** Schedule an action after `delay` ticks (default 0). */
    schedule(action: A, delay = 0): void {
        this.agenda.push(this.tick + delay, action);
    }

    /** Advance exactly one tick and process any events at that tick. */
    step(): void {
        this.tick++;
        this.do();
    }

    /**
     * Jump to the next scheduled event, process all events at that tick,
     * and return the new current tick.
     */
    forward(): number {
        if (!this.hasNext()) return this.tick;
        const [nextTime] = this.agenda.peek()!;
        this.tick = nextTime;
        this.do();
        return this.tick;
    }

    /* ---------------- internals ---------------- */

    /**
     * Process every event whose time equals `this.tick`.
     * Repeats in case executing an event schedules another for the same tick.
     */
    private do(): void {
        while (true) {
            let processed = 0;
            while (
                this.agenda.length &&
                this.agenda.peek()![0] === this.tick
            ) {
                const [, action] = this.agenda.pop()!;
                this.execute(action);
                processed++;
            }
            if (processed === 0) break;  // nothing left at this tick
        }
    }
}