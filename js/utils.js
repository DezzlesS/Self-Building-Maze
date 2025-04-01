import { Maze } from "./js.js";


export const
    { floor, random, ceil } = Math,
    randIndex = (l) => floor(random() * l),

    wait = (ms) => new Promise(res => setTimeout(res, ms)),

    opposite = {
        'left': 'right',
        'right': 'left',
        'top': 'bottom',
        'bottom': 'top',
        undefined: ''
    },
    defaultWidth = 100,
    defaultSpeed = 1, //ms
    defaultSlowDown = 105, //ms
    defaultScale = 100,
    maxSpeed = 1, //ms
    minSpeed = 1750 //ms
;


export function evalSideLength(width, height) {
    if (!width && !height) width = defaultWidth;
    if (!width) {
        const cellSize = floor($('body').height() / height);
        width = floor($('body').width() / cellSize);
    }
    if (!height) {
        const cellSize = floor($('body').width() / width);
        height = floor($('body').height() / cellSize);
    }
    return [width, height];
}
export function evalSpeed(pageX) {
    let speed;
    if (pageX > Maze.mouseDownX) {
        speed = Maze.speed / 1.3;
        if (speed < maxSpeed) speed = maxSpeed;
    };
    if (pageX < Maze.mouseDownX) {
        speed = Maze.speed * 1.3;
        if (speed > minSpeed) speed = minSpeed;
    }
    return speed;
};



// static evalSpeed(clientX) { 
//     const
//         docWidth = $(document).width(),
//         mouseX = clientX / docWidth; //proportion
//     ;
//     return maxSpeed - maxSpeed * mouseX;
// }


// static get dimension() { return Maze.dim }
// static set dimension(dim) {
//     const [width, height] = [dim, dim];
//     Maze.create({...Maze, width, height })
// }