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
    

    
    static pathMark = 'path';
    static visitedMark = 'visited';

    static container;
    static buildingComplete = false;
    static forwardCondition = () => Maze.candidates.length;
    static candidateContition = ({ dataset }) => !(Maze.pathMark in dataset);
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
    
    static async create(input) {
        Maze.reset(input);
        Maze.createHTML(input);
        await Maze.createPath();
        await Maze.findWayOut();
    }
    static reset(input) {
        Maze.input = input;
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
                .attr('data-index', i => i)
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
        Maze.candidate = [Maze.firstCell]



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
    static clearPathData() {
        Maze.cells.removeAttr(`data-${Maze.pathMark}}`);
    }
    static async createPath() {
        do {
            await Maze.moveForwards();
            await Maze.moveBackwards();
        } while (!Maze.head.hasClass('first'));
        Maze.head.removeClass('--head');
        Maze.clearPathData();
        
        Maze.buildingComplete = true;
    }
    static async findWayOut() {
        Maze.forwardCondition = () => (
            Maze.candidates.length &&
            !Maze.head.hasClass('last')
        )
        Maze.candidateContition = (
            { dataset },
            fromSide,
        ) => {
            const toSides = dataset.side;
            return (
                !(Maze.pathMark in dataset) &&
                toSides.includes(opposite[fromSide])
            )  
        }
        Maze.reset({...Maze.input, speed: Maze.speed});
        Maze.head = Maze.firstCell;
        Maze.candidate = [Maze.firstCell]
        Maze.pathMark = 'pathfind';
        Maze.visitedMark = 'visited';
        do {
            await Maze.moveForwards();
            if (Maze.head.hasClass('last')) break;
            await Maze.moveBackwards();

        } while(true);
        Maze.head.removeClass('--head');
    }
    static async moveForwards() {
        do {
            await Maze.moveHead(
                Maze.candidate[0]
            );
            Maze.markNewPath();
            
            Maze.candidates = Maze.findCandidates();
            Maze.candidate = Maze.pickCandidate();
            // if (Maze.a)
            if (!Maze.buildingComplete) Maze.setWalls();
            if (Maze.speed > 100) Maze.highlightCandidates();

            Maze.path.push(Maze.head);
            // Maze.wholePath.push(Maze.prev[0]);
        } while (Maze.forwardCondition());
    }
    static async moveBackwards() {
        Maze.path.pop()
        do {
            Maze.markVisited();
            const head = Maze.path.pop();
            if (!head) return;
            await Maze.moveHead(head);
            Maze.candidates = Maze.findCandidates();
            // Maze.wholePath.push(cell[0]);
        } while (!Maze.candidates.length);
        Maze.path.push(Maze.head);
        Maze.candidate = Maze.pickCandidate();
        if (Maze.buildingComplete) return;
        Maze.removeWall();
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
            ].filter(([it, side]) => it &&  Maze.candidateContition(it, side))
        ;
        return candidates;
    }
    static pickCandidate() {
        const rand = randIndex(Maze.candidates.length);
        return Maze.candidates[rand];
    }
    static setWalls() {
        try {
            const
                side = Maze.candidate?.[1] || '',
                prevSide = Maze.prev.attr('data-side')?.split(' ')?.[0]
            ;
            Maze.head
                .addClass('--bordered')
                .attr('data-side', `${side} ${opposite[prevSide]}`)
            ;
        } catch (error) {
            console.log(error);
            debugger
        }
    }
    static removeWall() {
        const [,side] = Maze.candidate;
        Maze.head.attr('data-side', (_, attr) => `${side} ${attr}`);
    }
    static async moveHead(
        newHead
    ) {
        if (Maze.restart) Maze.create(Maze.input);
        if (Maze.frozen) {
            Maze.highlightCandidates(true);
            await Maze.freezeLoop();
        };
        if (Maze.speed > 0) await wait(Maze.speed);

        Maze.prev = Maze.head
            .removeClass('--head')
            .removeAttr('data-head')
        ;
        Maze.head = $(newHead)
            .addClass('--head')
            .attr('data-head', '')
        ;
    }
    static markVisited() {
        if (Maze.buildingComplete) {
            Maze.head
            .removeClass(`--${Maze.visitedMark} --${Maze.pathMark}`)
            .addClass(`--${Maze.visitedMark}-pathfind`)
        } else {
            Maze.head
            .removeClass(`--${Maze.pathMark}`)
            .addClass(`--${Maze.visitedMark}`)
            .attr(`data-${Maze.visitedMark}`, '')
        }
    }
    static markNewPath() {
        Maze.head
            .addClass(`--${Maze.pathMark}`)
            .attr(`data-${Maze.pathMark}`, '',)
        ;
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

Maze.create({w:30,  });




// while (Maze.frozen) { // Check if the maze is frozen
//     console.log("Maze generation is frozen...");
//     await wait(100); // Pause for 100ms before checking again
// }
// console.log("Maze generation resumed.");