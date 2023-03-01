const { floor, random } = Math

const randIndex = (l) => floor(random() * l);

const wait = (ms) => new Promise(res => setTimeout(res, ms))

const opposite = {
    'left': 'right',
    'right': 'left',
    'top': 'bottom',
    'bottom': 'top',
    undefined: ''
}

class Maze {
    static container = $('.maze-container');


    static height = 1267; // px
    static width = 2502; // px
    static dim = 200; // rows
    static speed = 1 //ms

    static path = [];
    

    
    static create() {
        Maze.createHTML();
        Maze.createPath();
    }

    static createHTML({
        height, dim, width
    } = Maze) {
        const
            rowHeight = (height / dim),
            rowItemsAmount = floor(width / rowHeight),
            insertCells = $('<div class="cell"></div>'.repeat(rowItemsAmount))
        ;
        const
            rows = $(`<div class=row></div>`.repeat(dim))
                .css('height', rowHeight)
                .attr('index', i => i)
                .append(insertCells)
                .each((r, row) => $(row).children().attr({
                    'data-row': r,
                    'data-col': c => c
                }))
                .appendTo(Maze.container),
            cells = $('.cell')
        ;
        Maze.rows = rows;
        Maze.cells = cells;
        Maze.firstCell = cells.first().addClass('first').css('border-left', 'none');;
        Maze.lastCell = cells.last().addClass('last').css('border-right', 'none');;
        Maze.current = Maze.firstCell;
    }

    static async createPath() {
        do {
            await Maze.moveForwards();
            await Maze.goBackwards();
        } while (!Maze.current.hasClass('first'));
    }

    static async moveForwards() {
        while (!Maze.lastCell.prop('head')) {

            Maze.markNewPath();
            
            Maze.candidates = Maze.findCandidates();
            
            if (!Maze.candidates.length) {
                Maze.setWalls(true);
                return;
            };
            Maze.candidate = Maze.pickCandidate();
            Maze.setWalls();

            Maze.newCurrent();
            Maze.path.push(Maze.prev)

            await Maze.moveHead();
        }
    }

    static async goBackwards() {
        do {
            const cell = Maze.path.at(-1);
            Maze.settlePath();
            
            Maze.prev = Maze.current;
            Maze.current = cell;
            
            await Maze.moveHead();

            Maze.candidates = Maze.findCandidates();

            if (Maze.candidates.length) {
                Maze.candidate = Maze.pickCandidate();
                Maze.removeWall();
                Maze.newCurrent();
                await Maze.moveHead();
                break;
            };
            Maze.path.pop();

        } while (Maze.path.length);
    }
    
    static findCandidates(
        item = Maze.current
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

    static pickCandidate() {
        const 
            { length } = Maze.candidates,
            rand = length > 1
                ? randIndex(length)
                : 0
        ;
        return Maze.candidates[rand];
    }
    
    static newCurrent() {
        const [current] = Maze.candidate;
        Maze.prev = Maze.current;
        Maze.current = $(current);
    }
    
    static setWalls(deadEnd) {
        const
            side = deadEnd
                ? ''
                : Maze.candidate[1]
            ,
            prevSide = Maze.prev?.attr('side').split(' ')[0]
        ;
        Maze.current
            .addClass('--bordered')
            .attr('side', `${side} ${opposite[prevSide]}`)
        ;
    }

    static removeWall() {
        const [,side] = Maze.candidate;
        Maze.current.attr('side', (_, attr) => `${side} ${attr}`);
    }

    
    static async moveHead() {
        if (Maze.speed > 0) await wait(Maze.speed);

        Maze.prev.removeClass('--head')
            .removeAttr('head')
        ;
        Maze.current.addClass('--head')
            .attr('head', '')
        ;
    }

    static settlePath() {
        Maze.current
            .removeClass('--path')
            .addClass('--settled')
            .attr('settled', '')
        ;
    }

    static markNewPath() {
        Maze.current
            .addClass('--path')
            .attr('path', '',)
        ;
    }
}

Maze.create()