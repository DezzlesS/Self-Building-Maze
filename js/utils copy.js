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
    maxSpeed = 1, //ms
    minSpeed = 1750 //ms
;


export function evalSideLength(w, h) {
    if (!w && !h) w = defaultWidth;
    if (h) {
        const cellSize = floor($('body').height() / h);
        w = floor($('body').width() / cellSize);
    }
    if (w) {
        const cellSize = floor($('body').width() / w);
        h = floor($('body').height() / cellSize);
    }
    return [w, h];
}
export function evalSpeed(
    pageX, { mouseDownX, speed } 
) {
    let newSpeed;
    if (pageX > mouseDownX) {
        newSpeed = speed / 1.3;
        if (newSpeed < maxSpeed) newSpeed = maxSpeed;
    }
    if (pageX < mouseDownX) {
        newSpeed = speed * 1.3;
        if (newSpeed > minSpeed) newSpeed = minSpeed;
    }
    return newSpeed;
}
