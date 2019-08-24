export abstract class Simulator<Action> {
    tick = 0
    agenda = Array<[number, Action]>()
    statistics = { totalItems: 0 }

    abstract execute(a: Action): void

    step() {
        this.tick += 1
        this.do()
    }

    do() {
        while (true) {
            // Later change it to a SortedMap and get rid of this nonsense
            const items = this.agenda.filter(i => i[0] === this.tick)
            if (items.length === 0) return

            this.agenda = this.agenda.filter(i => i[0] !== this.tick)
            items.forEach(item => this.execute(item[1]))
        }
    }

    schedule(item: Action, delay: number = 0) {
        this.statistics.totalItems += 1
        this.agenda.push([this.tick + delay, item])
    }

    forward(): number {
        if (this.hasNext()) {
            this.tick = Math.min(... this.agenda.map(i => i[0]))
            this.do()
        }

        return this.tick
    }

    hasNext() {
        return this.agenda.length !== 0
    }
}