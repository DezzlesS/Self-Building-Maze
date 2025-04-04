export const
    { floor, random, ceil } = Math,
    randNum = (l) => floor(random() * l),

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
    minSpeed = 1750, //ms
    defaultLoopSize = 100
;

export const
    getCols = rows => [...rows[0].children].map((_,i) => rows.map((_,{ children }) => children[i])),
    createColorStyle = ({
        pathMark, pathfindMark,
        pathColor, pathfindColor
    }) => $('<style>')
            .html(`
                .--${pathMark} { background-color: ${pathColor} }
                .--${pathfindMark} { background-color: ${pathfindColor} }`
            )
            .appendTo('body')
            
;

export function evalSideLength({
    w: width,
    h: height
}) {
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
export function evalSpeed(
    pageX,
    mouseDownX,
    mazeSpeed
) {
    let speed;
    if (pageX > mouseDownX) {
        speed = mazeSpeed / 1.3;
        if (speed < maxSpeed) speed = maxSpeed;
    };
    if (pageX < mouseDownX) {
        speed = mazeSpeed * 1.3;
        if (speed > minSpeed) speed = minSpeed;
    }
    return speed;
};