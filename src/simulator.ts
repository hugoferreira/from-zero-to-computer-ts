export class Simulator<Action extends () => void> {
    tick = 0
    agenda = Array<[number, Action]>()
    statistics = { totalItems: 0 }

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
            items.forEach(item => item[1]())
        }
    }

    schedule(item: Action, delay: number = 0) {
        this.statistics.totalItems += 1
        this.agenda.push([this.tick + delay, item])
    }

    forward(): number {
        if (this.hasNext()) {
            this.agenda.sort((a, b) => a[0] - b[0])
            this.tick = this.agenda[0][0]
            this.do()
        }

        return this.tick
    }

    hasNext() {
        return this.agenda.length !== 0
    }
}