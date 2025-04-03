import {
    defaultSpeed,
    evalSpeed,
    randIndex,
    defaultSlowDown, 
    evalSideLength,
    opposite,
    wait,
    defaultWidth,
    defaultScale,
    defaultLoopSize,
    getCols
} from "./utils.js";

const defaultParameters = () => ({
    container: undefined,

    w: defaultWidth,
    h: undefined,
    scl: defaultScale,
    speed: defaultSpeed,

    path: [],

    candidate: undefined,
    candidates: undefined,

    prev: undefined,
    head: undefined,
    
    pathMark: 'path',
    visitedMark: 'visited',

    buildingComplete: false,
    restart: false,
    
    forwardCondition: () => Maze.candidates.length,
    candidateContition: ({ dataset }) => !(Maze.pathMark in dataset)
})
export class Maze {
    static w;
    static h;

    static frozen;
    static speedControl;
    static slowedDown;
    static mouseDownX;
    static mouseMoveThrottlingTimeout;

    static keyDownHandlers;
    static keyUpHandlers;
    
    static loopSize = defaultLoopSize;
    
    static events = {
        'mousedown': Maze.mouseDownHandler,
        'mouseup': Maze.mouseUpHandler,

        'dblclick': Maze.dblclickHandler,
        
        'wheel': Maze.mouseWheelHandler,
        
        'dragstart'(e) {
            e.preventDefault();
        },
        
        'keydown': Maze.keyDownHandler,
        'keyup': Maze.keyUpHandler,
    }
    
    static async create(input) {
        Maze.input = input;
        Maze.loop();
    }
    static async loop() {
        for (let i = 0; i < Maze.loopSize; i++) {
            Maze.reset();
            Maze.createHTML();
            try {
                await Maze.createPath();
                await Maze.findWayOut();
            } catch (error) { console.log('Maze restarted') }
        }
    }
    static reset(input = {}) {
        const
            resetData = {...input, ...Maze.input },
            defaultParams = defaultParameters()
        ;
        for (const prop in defaultParams) {
            Maze[prop] = resetData[prop] || defaultParams[prop];
        }
    }
    static createHTML() {
        const
            [w, h] = evalSideLength(Maze),
            insertCells = $('<div class="cell"></div>'.repeat(w)),
            rows = $(`<div class=row></div>`.repeat(h))
                // .css('height', rowHeight)
                .attr('data-index', i => i)
                .append(insertCells)
                .each((r, row) => $(row).children().attr({
                    'data-row': r,
                    'data-col': c => c
                }))
        ;
        Maze.container.html(rows);

        Maze.w = w;
        Maze.h = h;
        Maze.rows = rows;
        Maze.cells = rows.children();
        Maze.firstCell = Maze.cells.first().addClass('first');
        Maze.lastCell = Maze.cells.last().addClass('last');
        
        Maze.head = Maze.firstCell;
        Maze.candidate = [Maze.firstCell];

        Maze.fixSize();
        Maze.initEvents();
    }


    static async createPath() {
        do {
            await Maze.moveForwards();
            await Maze.moveBackwards();
        } while (!Maze.head.hasClass('first'));

        Maze.head.removeClass('--head');
        Maze.buildingComplete = true;
    }
    static async findWayOut() {
        Maze.pathfindReset();
        do {
            await Maze.moveForwards();  
            if (Maze.head.hasClass('last')) break;
            await Maze.moveBackwards();
        } while(true);
        Maze.head.removeClass('--head');
        await Maze.pathDissappear();
    }
    static async pathDissappear() {
        for (const cell of Maze.path) {
            cell.removeClass(`--${Maze.pathMark}`);
            await wait(Maze.speed);
        }
    }
    static pathfindReset() {
        Maze.cells.removeAttr(`data-${Maze.pathMark}}`);
        
        Maze.reset({
            pathMark: 'pathfind',
            visitedMark: 'visited',
            head: Maze.firstCell,
            candidate: [Maze.firstCell],
            buildingComplete: Maze.buildingComplete,
            forwardCondition: () => (
                Maze.candidates.length &&
                !Maze.head.hasClass('last')
            ),
            candidateContition: (
                { dataset },
                fromSide,
            ) => {
                const toSides = dataset.side;
                return (
                    !(Maze.pathMark in dataset) &&
                    toSides.includes(opposite[fromSide])
                );
            }
        });
    }
    static async moveForwards() {
        do {
            const [head] = Maze.candidate
            await Maze.moveHead(head);
            Maze.markNewPath();
            
            Maze.candidates = Maze.findCandidates();
            Maze.candidate = Maze.pickCandidate();

            if (!Maze.buildingComplete) Maze.setWalls();
            if (Maze.speed > 100) Maze.highlightCandidates();

            Maze.path.push(Maze.head);
        } while (Maze.forwardCondition());
    }
    static async moveBackwards() {
        Maze.path.pop();
        do {
            Maze.markVisited();
            const head = Maze.path.pop();
            if (!head) return;

            await Maze.moveHead(head);
            Maze.candidates = Maze.findCandidates();

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
    static async highlightCandidates(keep) {
        const 
            candidates = Maze.candidates,
            delay = Maze.speed / (candidates.length + 1)
        ;
        for (const [cell] of candidates) {
            await wait(delay);
            cell.classList.add('candidate');
        };
        if (keep) return;
        
        await wait(delay)
        Maze.removeCandidatesHighlight(candidates);
    }
    static removeCandidatesHighlight(candidates) {
        for (const cell of candidates) {
            $(cell).removeClass('candidate');
        };
    }


    static async moveHead(
        newHead
    ) {
        if (Maze.restart) throw new Error();
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


    static setWalls() {
        const
            side = Maze.candidate?.[1] || '',
            prevSide = Maze.prev.attr('data-side')?.split(' ')?.[0]
        ;
        Maze.head
            .addClass('--bordered')
            .attr('data-side', `${side} ${opposite[prevSide]}`)
        ;
    }
    static removeWall() {
        const [,side] = Maze.candidate;
        Maze.head.attr('data-side', (_, attr) => `${side} ${attr}`);
    }

    
    static markVisited() {
        if (Maze.buildingComplete) {
            Maze.head
                .removeClass(`--${Maze.pathMark}`)
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

    
    static initEvents() {
        $(document)
            .off(Maze.events)
            .on(Maze.events)
        Maze.keyDownHandlers = {
            'Space'() {
                $(document).off('keydown');
                Maze.freeze();
            },
        }
        Maze.keyUpHandlers = {
            'Space'() {
                $(document).on('keydown', Maze.keyDownHandler);
                Maze.cancelFreeze();
            },
            'KeyR'() {
                Maze.restart = true;
            }
        }
    }
    static mouseDownHandler({ clientX }) {
        Maze.mouseDownX = clientX;
        if (!Maze.speedChanged) Maze.slowDown();

        Maze.mouseMoveThrottling(100);
    }
    static mouseUpHandler()  {
        clearTimeout(Maze.mouseMoveThrottlingTimeout);
        $(document).off('mousemove', Maze.mouseMoveHandler);

        if (Maze.frozen) return;
        if (Maze.slowedDown) Maze.cancelSlowDown(); 

        Maze.speedControl = false;        
    }
    static mouseMoveHandler(e)  {
        Maze.setSpeed(e);
        Maze.slowedDown = false;
        Maze.speedControl = true;
        
        Maze.mouseMoveThrottling(50);
    }
    static dblclickHandler() {
        Maze.speed = defaultSpeed;
        Maze.speedChanged = false;
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
    static mouseMoveThrottling(delay) {
        $(document).off('mousemove', Maze.mouseMoveHandler);
        Maze.mouseMoveThrottlingTimeout = setTimeout(() => {
            $(document).on('mousemove', Maze.mouseMoveHandler);
        }, delay);
    }



    static setSpeed({ pageX }) {
        if (pageX === Maze.mouseDownX) return;
        Maze.speed = evalSpeed(
            pageX,
            Maze.mouseDownX,
            Maze.speed
        );
        Maze.speedChanged = true;
        Maze.mouseDownX = pageX;
    }
    static slowDown() {
        Maze.speed = defaultSlowDown;
        Maze.slowedDown = true;
    }
    static cancelSlowDown() {
        Maze.speed = defaultSpeed;
        Maze.slowedDown = false;
    }
    static freeze() {
        Maze.frozen = true;
    }
    static async cancelFreeze() {
        Maze.frozen = false;
        Maze.removeCandidatesHighlight(Maze.candidates);
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
    static fixSize() {
        Maze.container.css(
            Maze.container.css(['width', 'height'])
        )
    }


    static get speed() { return Maze.input.speed }
    static set speed(speed) {
        Maze.input.speed = speed;
        console.log(`Speed: ${speed}`);
    }
    static get scale() { return Maze.scl }
    static set scale(scl) {
        Maze.container.css({
            width: `${scl}%`,
            height: `${scl}%`
        });
        Maze.scl = scl;
        Maze.input.scl = scl;
    }
    static get width () { return Maze.w }
    static set width(w) {
        Maze.input.w = w;
        delete Maze.input.h;
        Maze.restart = true;
    }
    static get height () { return Maze.h }
    static set height(h) {
        Maze.input.h = h;
        delete Maze.input.w;
        Maze.restart = true;
    }
}

Maze.create({
    container: $('.maze-container'),
    w: 30,
});