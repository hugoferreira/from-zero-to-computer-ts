import { expect } from 'chai';
import { Simulator } from '../src/simulator';

// Test implementation of Simulator
class TestSimulator extends Simulator<string> {
    public executedActions: string[] = [];

    execute(action: string): void {
        this.executedActions.push(action);
    }
}

describe('MinHeap', () => {
    // We'll test MinHeap through a separate instance to isolate heap behavior
    let heap: any; // Using any to access private class

    beforeEach(() => {
        // Create new heap instance before each test
        heap = new (class TestHeap<T> extends Simulator<T> {
            execute() {} // dummy implementation
        })().agenda;
    });

    it('maintains min-heap property', () => {
        heap.push([3, 'c']);
        heap.push([1, 'a']);
        heap.push([2, 'b']);

        expect(heap.pop()).to.deep.equal([1, 'a']);
        expect(heap.pop()).to.deep.equal([2, 'b']);
        expect(heap.pop()).to.deep.equal([3, 'c']);
    });

    it('handles empty heap', () => {
        expect(heap.pop()).to.be.undefined;
        expect(heap.peek()).to.be.undefined;
        expect(heap.length).to.equal(0);
    });

    it('adjustPriorities works correctly', () => {
        heap.push([10, 'a']);
        heap.push([20, 'b']);
        heap.adjustPriorities(5);
        
        expect(heap.pop()).to.deep.equal([5, 'a']);
        expect(heap.pop()).to.deep.equal([15, 'b']);
    });
});

describe('Simulator', () => {
    let simulator: TestSimulator;

    beforeEach(() => {
        simulator = new TestSimulator();
    });

    it('basic scheduling and execution', () => {
        simulator.schedule('action1', 1);
        simulator.schedule('action2', 2);
        
        simulator.step(); // tick = 1
        expect(simulator.executedActions).to.deep.equal(['action1']);
        
        simulator.step(); // tick = 2
        expect(simulator.executedActions).to.deep.equal(['action1', 'action2']);
    });

    it('forward advances to next event', () => {
        simulator.schedule('action1', 5);
        simulator.schedule('action2', 10);

        expect(simulator.forward()).to.equal(5);
        expect(simulator.executedActions).to.deep.equal(['action1']);
        
        expect(simulator.forward()).to.equal(10);
        expect(simulator.executedActions).to.deep.equal(['action1', 'action2']);
    });

    it('multiple actions at same tick', () => {
        simulator.schedule('action1', 1);
        simulator.schedule('action2', 1);
        simulator.schedule('action3', 1);

        simulator.step();
        expect(simulator.executedActions).to.deep.equal(['action1', 'action2', 'action3']);
    });

    it('tick normalization', () => {
        simulator.schedule('action1', 15000);
        simulator.schedule('action2', 15001);

        simulator.forward(); // Should execute action1 and normalize
        expect(simulator.tick).to.be.lessThan(10000);
        expect(simulator.executedActions).to.deep.equal(['action1']);

        simulator.forward(); // Should execute action2
        expect(simulator.executedActions).to.deep.equal(['action1', 'action2']);
    });

    it('hasNext reflects agenda state', () => {
        expect(simulator.hasNext()).to.be.false;
        
        simulator.schedule('action1', 1);
        expect(simulator.hasNext()).to.be.true;
        
        simulator.forward();
        expect(simulator.hasNext()).to.be.false;
    });
}); 