import {
    defaultSpeed,
    evalSpeed,
    randIndex,
    defaultSlowDown, 
    evalSideLength,
    opposite,
    wait,
    defaultWidth,
    defaultScale
} from "./utils.js";

const { assign } = Object;

const defaultParameters = {
    container: $('.maze-container'),
    w: defaultWidth,
    h: undefined,
    scl: defaultScale,

    speed: defaultSpeed,
    lastSpeed: defaultSpeed,

    path: [],
    wholePath: [], 

    candidate: undefined,
    candidates: undefined,

    prev: undefined,
    head: undefined,

    frozen: false,
    speedControl: false,

    mouseDownX: undefined,

    restart: false
}


export class Maze {
    static w;
    static h;

    static container;

    static keyDownHandlers = {
        'Space'() {
            $(document).off('keydown');
            Maze.freeze();
        },
    }
    static keyUpHandlers = {
        'Space'() {
            $(document).on('keydown', Maze.keyDownHandler);
            Maze.cancelFreeze();
        },
        'KeyR'() {
            Maze.input = {
                w: Maze.w,
                scl: Maze.scl,
                speed: Maze.speed
            }
            Maze.restart = true;
        }
    }

    static get scale() { return Maze.scl }
    static set scale(scl) {
        Maze.container.css({
            width: `${scl}%`,
            height: `${scl}%`
        });
        Maze.scl = scl;
    }
    
    static create(input) {

        Maze.reset(input);
        Maze.createHTML(input);
        Maze.createPath();
    }
    static reset(input) {
        assign(Maze, defaultParameters, input);
    }

    static createHTML({
        w, h
    } = Maze) {
        [w, h] = evalSideLength(w, h);
        const
            insertCells = $('<div class="cell"></div>'.repeat(w)),
            rows = $(`<div class=row></div>`.repeat(h))
                // .css('height', rowHeight)
                .attr('index', i => i)
                .append(insertCells)
                .each((r, row) => $(row).children().attr({
                    'data-row': r,
                    'data-col': c => c
                })),
            cells = rows.contents()
        ;
        Maze.container.html(rows);
        Maze.fixSize();

        Maze.w = w;
        Maze.h = h;
        Maze.rows = rows;
        Maze.cells = cells;
        Maze.firstCell = cells.first().addClass('first');
        Maze.lastCell = cells.last().addClass('last');
        Maze.head = Maze.firstCell;

        $(document).on({
            'mousedown': Maze.mouseDownHandler,
            'mouseup': Maze.mouseUpHandler,
            
            'wheel': Maze.mouseWheelHandler,
            
            'dragstart'(e) {
                e.preventDefault();
            },
            
            'keydown': Maze.keyDownHandler,
            'keyup': Maze.keyUpHandler,
        })
    }
    static async createPath() {
        do {
            await Maze.moveForwards();
            await Maze.moveBackwards();
        } while (!Maze.head.hasClass('first'));
        Maze.head.removeClass('--head');
    }
    static async moveForwards() {
        while (!Maze.lastCell.prop('head')) {

            Maze.markNewPath();
            
            Maze.candidates = Maze.findCandidates();
            Maze.candidate = Maze.pickCandidate();
            Maze.setWalls();
            if (!Maze.candidates.length) return;
            if (Maze.speed > 100) Maze.highlightCandidates();


            Maze.newHead();
            Maze.path.push(Maze.prev);
            // Maze.wholePath.push(Maze.prev[0]);

            await Maze.moveHead();
        }
    }
    static async moveBackwards() {
        while (Maze.path.length) {
            const cell = Maze.path.at(-1);
            Maze.settlePath();
            // Maze.wholePath.push(cell[0]);
            
            Maze.prev = Maze.head;
            Maze.head = cell;
            
            await Maze.moveHead();
            

            Maze.candidates = Maze.findCandidates();

            if (Maze.candidates.length) {
                Maze.candidate = Maze.pickCandidate();
                Maze.removeWall();
                Maze.newHead();
                await Maze.moveHead();
                return;
            };
            Maze.path.pop();
        };
        Maze.settlePath();
    }
    static findCandidates(
        item = Maze.head
    ) {
        const
            { col } = item.data(),
            parent = item.parent(),
            candidates = [
                [item.prev()[0], 'left'],
                [item.next()[0], 'right'],
                [parent.prev().children()[col], 'top'],
                [parent.next().children()[col], 'bottom']
            ].filter(([it]) => it && !it.attributes.path)
        ;
        return candidates;
    }
    static async highlightCandidates(keep) {
        let i = 1;
        const 
            candidates = Maze.candidates,
            { length } = candidates,
            delay = Maze.speed / (length + 1) 
        ;
        for (const [cell] of candidates) {
            setTimeout(() => {
                cell.classList.add('candidate');
            }, delay * i++)
        };
        if (keep) return;
        
        setTimeout(Maze.removeCandidatesHighlight, delay*i, candidates);
    }
    static removeCandidatesHighlight(candidates) {
        for (const cell of candidates) {
            $(cell).removeClass('candidate');
        };
    }
    static pickCandidate() {
        const rand = randIndex(Maze.candidates.length);
        return Maze.candidates[rand];
    }
    static newHead() {
        const [head] = Maze.candidate;
        Maze.prev = Maze.head;
        Maze.head = $(head);
    }
    static setWalls() {
        const { candidate } = Maze;
        try {
            const
                side = candidate?.[1] || '',
                prevSide = Maze.prev?.attr('side').split(' ')[0]
            ;
            Maze.head
                .addClass('--bordered')
                .attr('side', `${side} ${opposite[prevSide]}`)
            ;
        } catch (error) {
            console.log(error);
            debugger
        }
    }
    static removeWall() {
        const [,side] = Maze.candidate;
        Maze.head.attr('side', (_, attr) => `${side} ${attr}`);
    }
    static async moveHead() {
        if (Maze.restart) Maze.create(Maze.input);
        if (Maze.frozen) {
            Maze.highlightCandidates(true);
            await Maze.freezeLoop();
        };
        if (Maze.speed > 0) await wait(Maze.speed);

        Maze.prev
            .removeClass('--head')
            .removeAttr('head');
        Maze.head
            .addClass('--head')
            .attr('head', '');
    }
    static settlePath() {
        Maze.head
            .removeClass('--path')
            .addClass('--settled')
            .attr('settled', '')
        ;
    }
    static markNewPath() {
        Maze.head
            .addClass('--path')
            .attr('path', '',)
        ;
    }
    static async freezeLoop() {
        let time = 0;
        
        console.log("Generation freezed.");    
        const interval = setInterval(() => {
            console.log(`freezing... ${time++} seconds`);
        }, 1000, time);
        
        while (Maze.frozen) await wait(100);
        clearInterval(interval);

        console.log("Generation resumed.");
    }

    


    static mouseDownHandler({ clientX }) {
        Maze.mouseDownX = clientX;
        Maze.slowDown();

        Maze.mouseMoveThrottling(100);
    }
    static mouseUpHandler()  {
        if (Maze.frozen) return;
        $(document).off('mousemove', Maze.mouseMoveHandler);
        Maze.cancelSlowDown(); 
    }
    static mouseMoveHandler(e)  {
        if (Maze.speedControl) Maze.accelerate(e);
        Maze.mouseMoveThrottling(50);
    }
        
    static mouseWheelHandler({
        originalEvent: { deltaY },
        altKey
    }) {
        if (altKey) Maze.changeScale(deltaY)
    }

    static keyDownHandler({ code }) {
        if (Maze.keyDownHandlers[code]) {
            Maze.keyDownHandlers[code]();
        }
    }
    static keyUpHandler({ code }) {
        if (Maze.keyUpHandlers[code]) {
            Maze.keyUpHandlers[code]();
        }
    }
    static mouseMoveThrottling(delay)  {
        $(document).off('mousemove');
        setTimeout(() => {
            $(document).on('mousemove', Maze.mouseMoveHandler);
        }, delay);
    }



    static accelerate({ pageX }) {
        Maze.speedControl = true;
        
        if (pageX === Maze.mouseDownX) return;
        Maze.speed = evalSpeed(pageX);
        Maze.mouseDownX = pageX;
        console.log(`Speed: ${Maze.speed}`);
    }
    static slowDown() {
        Maze.speedControl = true;
        Maze.speed = defaultSlowDown;
    }
    static cancelSlowDown() {
        Maze.speedControl = false;
        Maze.speed = defaultSpeed;
    }
    static freeze() {
        Maze.frozen = true;
    }
    static cancelFreeze() {
        Maze.frozen = false;
        setTimeout(Maze.removeCandidatesHighlight, 0, Maze.candidates)
    }
    static changeScale(deltaY) {
        if (deltaY < 0) {
          if (Maze.scale === 100) return;
            Maze.scale += 10;
        } else {
            if (Maze.scale === 10) return;
            Maze.scale -= 10;
        };
        Maze.fixSize();
        console.log(`Scale: ${Maze.scale}`);
        
    }
    static fixSize() {
        Maze.container.css(
            Maze.container.css(['width', 'height'])
        )
    }
}

Maze.create();




// while (Maze.frozen) { // Check if the maze is frozen
//     console.log("Maze generation is frozen...");
//     await wait(100); // Pause for 100ms before checking again
// }
// console.log("Maze generation resumed.");