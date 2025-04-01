import { evalSpeed, randIndex } from "./utils copy.js";
import {
    defaultSlowDown,
    defaultSpeed,
    evalSideLength,
    opposite,
    wait
} from "./utils copy.js";
const { assign } = Object;

const defaultParameters = {
    speed: defaultSpeed, // ms
    lastSpeed: defaultSpeed,

    w: 100,
    h: undefined,
    scl: 100,

    frozen: false,
    speedControl: false,

    path: [],
    wholePath: [],
}

class Maze {
    constructor(container, input) {
        this.container = $(container);

        assign(this, defaultParameters, input);
        this.input = input;
        
        this.scale = this.scl;
        this.initEventHandlers();
    }

    initEventHandlers() {
        $(document).on({
            'mousedown': this.mouseDownHandler.bind(this),
            'mouseup': this.mouseUpHandler.bind(this),
            'wheel': this.mouseWheelHandler.bind(this),
            'dragstart': (e) => e.preventDefault(),
            'keydown': this.keyDownHandler.bind(this),
            'keyup': this.keyUpHandler.bind(this),
        });


        this.keyDownHandlers = {
            'Space'() {
                $(document).off('keydown');
                this.freeze();
            },
        },
        this.keyUpHandlers = {
            'Space'() {
                this.continue();
                $(document).on('keydown', this.keyDownHandler.bind(this));
            },
            'KeyR'() {
                this.create(this.input);
            }
        };
    }

    create() {
        this.createHTML();
        this.createPath();
    }

    createHTML({ w, h } = this) {
        [w, h] = evalSideLength(w, h);
        const 
            insertCells = $('<div class="cell"></div>'.repeat(w)),
            rows = $(`<div class=row></div>`.repeat(h))
                .attr('index', (i) => i)
                .append(insertCells)
                .each((r, row) => $(row)
                    .children()
                    .attr({
                        'data-row': r,
                        'data-col': (c) => c,
                    })
                ),
            cells = rows.contents()
        ;
        this.container.html(rows);

        this.w = w;
        this.h = h;
        this.rows = rows;
        this.cells = cells;
        this.firstCell = cells.first().addClass('first');
        this.lastCell = cells.last().addClass('last');
        this.head = this.firstCell;
    }

    async createPath() {
        do {
            await this.moveForwards();
            await this.moveBackwards();
        } while (!this.head.hasClass('first'));
        this.head.removeClass('--head');
    }

    async moveForwards() {
        while (!this.lastCell.prop('head')) {
            this.markNewPath();
            this.candidates = this.findCandidates();
            if (!this.candidates.length) {
                this.setWalls(true);
                return;
            }
            // if (this.speed > 100)
            if (this.speedControl) this.highlightCandidates();

            this.candidate = this.pickCandidate();
            this.setWalls();

            this.newHead();
            this.path.push(this.prev);
            this.wholePath.push(this.prev[0]);

            await this.moveHead();
        }
    }

    async moveBackwards() {
        while (this.path.length) {
            const cell = this.path.at(-1);
            this.settlePath();
            this.wholePath.push(cell[0]);

            this.prev = this.head;
            this.head = cell;

            await this.moveHead();

            this.candidates = this.findCandidates();

            if (this.candidates.length) {
                this.candidate = this.pickCandidate();
                this.removeWall();
                this.newHead();
                await this.moveHead();
                return;
            }
            this.path.pop();
        }
        this.settlePath();
    }

    findCandidates(item = this.head) {
        const
            { col } = item.data(),
            parent = item.parent(),
            candidates = [
                [item.prev()[0], 'left'],
                [item.next()[0], 'right'],
                [parent.prev().children()[col], 'top'],
                [parent.next().children()[col], 'bottom'],
            ].filter(([it]) => it && !it.attributes.path)
        ;                              
        return candidates;
    }

    async highlightCandidates(keep) {
        let i = 1;
        const 
            candidates = [...this.candidates],
            { length } = candidates,
            delay = this.speed / (length + 1)
        ;
        for (const [cell] of candidates) {
            setTimeout(() => {
                $(cell).addClass('candidate');
            }, delay * i++);
        }
        this.highlightCandidatesData = candidates;
        if (keep) return;
        
        setTimeout(() => {
            this.removeCandidatesHighlight(candidates);
        }, delay + 50);
    }

    removeCandidatesHighlight(candidates) {
        for (const [cell] of candidates) $(cell).removeClass('candidate');
    }

    pickCandidate() {
        const 
            { length } = this.candidates,
            rand = length > 1 ? randIndex(length) : 0
        ;
        return this.candidates[rand];
    }

    async newHead() {
        const [head] = this.candidate;
        this.prev = this.head;
        this.head = $(head);
        

        if (this.frozen) await this.freezeLoop();
    }

    setWalls(deadEnd) {
        try {
            const 
                side = deadEnd ? '' : this.candidate[1],
                prevSide = this.prev?.attr('side').split(' ')[0]
            ;
            this.head
                .addClass('--bordered')
                .attr('side', `${side} ${opposite[prevSide]}`);
        } catch (error) {
            console.log(error);
            debugger;
        }
    }
    

    removeWall() {
        const [, side] = this.candidate;
        this.head.attr('side', (_, attr) => `${side} ${attr}`);
    }

    async moveHead() {
        if (this.speed > 0) await wait(this.speed);

        this.prev
            .removeClass('--head')
            .removeAttr('head');
        this.head
            .addClass('--head')
            .attr('head', '');
    }

    settlePath() {
        this.head
            .removeClass('--path')
            .addClass('--settled')
            .attr('settled', '');
    }

    markNewPath() {
        this.head
            .addClass('--path')
            .attr('path', '');
    }

    async freezeLoop() {
        let time = 0;
        const interval = setInterval(() => {
            console.log(`freezing... ${time++} seconds`);
        }, 1000);

        while (this.frozen) await wait(100);
        clearInterval(interval);

        console.log('Generation resumed.');
    }
    

    get scale() { return this.scl }
    set scale(scl) {
        this.container.css({
            width: `${scl}%`,
            height: `${scl}%`,
        });
        this.scl = scl;
    }
    get width() { return this.w }
    set width(w) { new Maze(this.container, { w }) }

    get height() { return this.w }
    set height(h) { new Maze(this.container, { h }) }


    // Event Handlers

    mouseDownHandler({ clientX }) {
        this.mouseDownX = clientX;
        this.slowDown();
        this.mouseMoveThrottling(100);
    }
    mouseUpHandler() {
        $(document).off('mousemove');
        this.continue();
    }
    mouseMoveHandler(e) {
        if (this.speedControl) this.accelerate(e);
        this.mouseMoveThrottling(50);
    }
    mouseMoveThrottling(delay) {
        $(document).off('mousemove');
        setTimeout(() => {
            $(document).on('mousemove', this.mouseMoveHandler.bind(this));
        }, delay);
    }
    mouseWheelHandler({
        originalEvent: { deltaY },
        altKey
    }) {
        if (altKey) this.changeScale(deltaY);
    }
    keyDownHandler({ code }) {
        console.log(this.speedControl);
        if (this.keyDownHandlers[code]) {
            this.keyDownHandlers[code].call(this);
        }
    }
    keyUpHandler({ code }) {
        if (this.keyUpHandlers[code]) {
            this.keyUpHandlers[code].call(this);
        }
    }
    
    //Event Actions

    accelerate({ pageX }) {
        this.speedControl = true;


        if (pageX === this.mouseDownX) return;
        this.speed = evalSpeed(pageX, this);

        this.mouseDownX = pageX;
        console.log(`Speed: ${this.speed}`);
    }
    slowDown() {
        this.speedControl = true;
        this.speed = defaultSlowDown;
    }
    freeze() {
        this.frozen = true;
        this.findCandidates();
        this.highlightCandidates(true);
    }
    continue() {
        this.frozen = false;
        this.speedControl = false;
        this.speed = defaultSpeed;
        this.removeCandidatesHighlight(this.highlightCandidatesData)

    }
    changeScale(deltaY) {
        if (deltaY < 0) {
            if (this.scale === 100) return;
            this.scale += 10;
        } else {
            if (this.scale === 10) return;
            this.scale -= 10;
        };
        console.log(`Scale: ${this.scale}`);
    }
}

// Create an instance of the Maze class
const maze = new Maze('.maze-container', { w: 90, scl: 90});
maze.create();
console.log(maze);
