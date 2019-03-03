function RNG(seed) {
    // LCG using GCC's constants
    this.m = 0x80000000; // 2**31;
    this.a = 1103515245;
    this.c = 12345;

    if(typeof seed === 'string')
    {
        var num = 0;

        for(var i = 0; i < seed.length; i++)
        {
            num = num * 10;
            num += seed.charCodeAt(i);
        }

        seed = num;
    }

    if(!isNaN(seed) && typeof seed === 'string')
    {
        seed = Number(num);
    }

    if(typeof seed === 'number' && seed < 1)
    {
        seed *= 999999999;
    }

    if(!isNaN(seed))
    {
        seed = Math.floor(seed);
    }
    else
    {
        seed = null;
    }

    this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
}
RNG.prototype.nextInt = function() {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state;
}
RNG.prototype.nextFloat = function() {
    // returns in range [0,1]
    return this.nextInt() / (this.m - 1);
}

var rng = null;
function random(seed) {
    // var x = Math.sin(seed) * 10000;
    // return x - Math.floor(x);
    if(seed !== undefined || rng === null)
    {
        if(seed === undefined)
        {
            seed = 0;
        }

        rng = new RNG(seed);
    }
    return rng.nextFloat();
}

function loopInterval(callback, timeout, complete)
{
    var res = callback();

    if(typeof res === 'number')
    {
        timeout = Math.floor(res);
    }

    if(res !== false)
    {
        setTimeout(function()
        {
            loopInterval(callback, timeout, complete);
        }, timeout);
    }
    else
    {
        complete();
    }
}

function scope()
{
    var args = Array.prototype.slice.call(arguments),
        func = args.shift();

    return func.apply(null, args);
}

function range(start, length)
{
    var array = [];

    for(var i = start; i < start + length; i++)
    {
        array.push(i);
    }

    return array;
}

function each(list, callback)
{
    var keys = list instanceof Array ? range(0, list.length) : Object.keys(list);
    for(var i = 0; i < keys.length; i++)
    {
        var key = keys[i];
        callback(list[key], key);
    }
}

function every(list, callback, op)
{
    op = op === '|' ? '|' : '&';

    var res  = op === '&',
        keys = list instanceof Array ? range(0, list.length) : Object.keys(list);
    for(var i = 0; i < keys.length; i++)
    {
        var key = keys[i];
        if(op === '&')
        {
            res &= callback(list[key], key);
        }
        else
        {
            res |= callback(list[key], key);
        }
    }
    return res;
}

function eachPair(list, callback)
{
    var keys = list instanceof Array ? range(0, list.length) : Object.keys(list);
    for(var i = 0; i < keys.length - 1; i++)
    {
        callback(list[i], list[i + 1]);
    }
}

function getVal(obj, path, def)
{
    path = typeof path === 'number' ? path.toString() : (typeof path === 'string' ? path : null);

    var pathParts = path !== null ? path.split('.') : [],
        objPtr    = obj,
        valid     = objPtr !== undefined && objPtr !== null;

    if(pathParts.length > 0 && valid)
    {
        each(pathParts, function(pathPart)
        {
            valid &= objPtr[pathPart] !== undefined && objPtr[pathPart] !== null;

            if(valid)
            {
                objPtr = objPtr[pathPart];
            }
        });

        if(valid)
        {
            return objPtr;
        }
    }

    return def;
}

function setVal(obj, path, set)
{
    var pathParts = path.split('.'),
        lastPart  = pathParts.pop(),
        objPtr    = obj,
        valid     = objPtr !== undefined && objPtr !== null && lastPart !== undefined && lastPart !== null;

    if(pathParts.length > 0)
    {
        each(pathParts, function(pathPart)
        {
            valid &= objPtr[pathPart] !== undefined && objPtr[pathPart] !== null;

            if(valid)
            {
                objPtr = objPtr[pathPart];
            }
        });
    }

    if(valid)
    {
        objPtr[lastPart] = set;
    }
}

function htmlToElements(html)
{
    var wrapperEl = document.createElement('div');

    wrapperEl.innerHTML = html;

    return getVal(wrapperEl, 'children', []);
}

function htmlToElement(html)
{
    return getVal(htmlToElements(html), 0);
}

function template(id)
{
    var templateEl = document.getElementById(id);

    if(templateEl !== null)
    {
        var html = templateEl.innerHTML;
        return function(options)
        {
            var htmlRes = html.slice();

            each(options, function(val, key)
            {
                var replace = '\\{\\{' + key + '\\}\\}',
                    regex   = new RegExp(replace, 'g');

                htmlRes = htmlRes.replace(regex, val);
            });

            var resElements = htmlToElements(htmlRes);

            return resElements.length > 1 ? resElements : getVal(resElements, 0);
        }
    }
}

const UP    = 1,
      DOWN  = -1,
      LEFT  = -2,
      RIGHT = 2,
      DIRS  = [UP, DOWN, LEFT, RIGHT];

var appState = {},
    app      = null;

function config(path, set)
{
    appState = typeof appState === 'string' ? JSON.parse(appState) : appState;

    setVal(appState, path, set);
    setVal(app, path, set);

    appState = JSON.stringify(appState);
}

// function loadAppState(_appState)
// {
//     _appState = typeof _appState === 'string' ? _appState : (typeof _appState === 'object' ? JSON.stringify(_appState) : null);
//
//     if(_appState !== null)
//     {
//         appState = _appState;
//         init(false);
//     }
// }

var selectors = {
    canvas        : document.getElementById('app-canvas'),
    appSettings   : document.getElementById('app-settings'),
    appDump       : document.getElementById('app-dump'),
    // previewImage  : document.getElementById('app-preview-image'),
    piContainer   : document.getElementById('app-preview-image-container'),
    // card          : document.getElementById('app-card'),
    // row           : document.getElementById('app-row'),
};

function initApp(appId)
{
    if(getVal(app, 'encoder'))
    {
        config('captureGif', false);
        document.getElementById('captureGif').value = '';
    }

    appState                = typeof appState === 'string' ? appState : JSON.stringify(appState);
    app                     = JSON.parse(appState);
    app.loop                = true;
    app.id                  = (appId === undefined ? Math.random() : appId) + '';
    app.rng                 = new RNG(app.id);
    app.ticks               = 0,
    selectors.canvas.width  = app.width;
    selectors.canvas.height = app.height;
    app.ctx                 = selectors.canvas.getContext('2d');

    random(app.id);

    if(app.captureGif)
    {
        app.encoder = new GIFEncoder();
        app.encoder.setRepeat(0);
        app.encoder.setDelay(150);
        app.encoder.start();
    }

    return app.id;
}

function init(appId)
{
    appId = (appId === undefined ? Math.random() : appId) + '';

    var runInit = function()
    {
        // if(generateApp)
        // {
        appState = {
            speed      : getVal(app, 'speed', 150),
            captureGif : getVal(app, 'captureGif', false),
            width      : getVal(app, 'width', 810),
            height     : getVal(app, 'height', 810),
            render     : {
                cell : getVal(app, 'render.cell', false),
                gate : getVal(app, 'render.gate', false),
                line : getVal(app, 'render.line', false),
                data : getVal(app, 'render.data', true),
            },
            cell       : {
                size        : getVal(app, 'cell.size', ''),
                borderColor : getVal(app, 'cell.borderColor', '#00000022'),
                borderWidth : getVal(app, 'cell.borderWidth', 1),
            },
            data       : {
                colorI : 0,
                width  : getVal(app, 'data.width', 5),
                colors : getVal(app, 'data.colors', [
                    '#FF000033',
                    '#00FF0033',
                    '#0000FF33',
                    '#FFFF0033',
                    '#00FFFF33',
                    '#FF00FF33',
                ]),
                data   : [],
            },
            grid       : {
                cellsX : 20,
                cellsY : 20,
            },
            gate       : {
                width       : getVal(app, 'gate.width', 5),
                inColor     : getVal(app, 'gate.inColor', '#00FF0077'),
                outColor    : getVal(app, 'gate.outColor', '#0000FF77'),
                data        : [],
            },
            generate   : {
                data : {
                    min           : getVal(app, 'generate.data.min', 5),
                    max           : getVal(app, 'generate.data.max', 10),
                    chanceToSpawn : getVal(app, 'generate.data.chanceToSpawn', 0.1),
                },
                dataCluster : {
                    min : getVal(app, 'generate.dataCluster.min', 3),
                    max : getVal(app, 'generate.dataCluster.max', 8),
                },
                gate : {
                    min             : getVal(app, 'generate.gate.min', 150),
                    max             : getVal(app, 'generate.gate.max', 225),
                    minLimit        : getVal(app, 'generate.gate.minLimit', 1),
                    maxLimit        : getVal(app, 'generate.gate.maxLimit', 4),
                    minRecentLimit  : getVal(app, 'generate.gate.minRecentLimit', 1),
                    maxRecentLimit  : getVal(app, 'generate.gate.maxRecentLimit', 7),
                },
            },
        };

        var rng = new RNG(appId);

        each(range(0, Math.floor(rng.nextFloat() * appState.generate.data.min) + (appState.generate.data.max - appState.generate.data.min) + 1), function()
        {
            var isX   = rng.nextFloat() < 0.5,
                isMin = rng.nextFloat() < 0.5,
                rand  = Math.floor(rng.nextFloat() * (isX ? appState.grid.cellsY : appState.grid.cellsX) - 2) + 1,
                place = [],
                dir   = DIRS[Math.floor(rng.nextFloat() * DIRS.length)];

            if(isX)
            {
                place[0] = isMin ? 0 : appState.grid.cellsX;
                place[1] = rand;
                dir      = isMin ? RIGHT : LEFT;
            }
            else
            {
                place[0] = rand;
                place[1] = isMin ? 0 : appState.grid.cellsY;
                dir      = isMin ? UP : DOWN;
            }

            each(range(0, Math.floor(rng.nextFloat() * appState.generate.dataCluster.min) + (appState.generate.dataCluster.max - appState.generate.dataCluster.min) + 1), function()
            {
                appState.data.data.push({
                    place : place,
                    dir   : dir,
                    data  : [place],
                });
            });
        });

        each(range(0, Math.floor(rng.nextFloat() * appState.generate.gate.min) + (appState.generate.gate.max - appState.generate.gate.min) + 1), function()
        {
            var x         = Math.floor(rng.nextFloat() * (appState.grid.cellsX - 2)) + 1,
                y         = Math.floor(rng.nextFloat() * (appState.grid.cellsY - 2)) + 1,
                inDir     = DIRS[Math.floor(rng.nextFloat() * DIRS.length)],
                availDirs = inDir === UP || inDir === DOWN ? [LEFT, RIGHT] : [UP, DOWN],
                outDir    = availDirs[Math.floor(rng.nextFloat() * availDirs.length)];

            appState.gate.data.push({
                hit         : 0,
                recentHit   : 0,
                recentLimit : Math.floor(rng.nextFloat() * appState.generate.gate.minRecentLimit) + (appState.generate.gate.maxRecentLimit - appState.generate.gate.minRecentLimit) + 1,
                limit       : Math.floor(rng.nextFloat() * appState.generate.gate.minLimit) + (appState.generate.gate.maxLimit - appState.generate.gate.minLimit) + 1,
                colors      : [],
                place       : [x, y],
                in          : inDir,
                out         : outDir,
            });
        });
    // }

        var generateOptions = app === null;

        appId                       = initApp(appId);
        app.uuid                    = Math.random() + '';
        selectors.appDump.innerHTML = JSON.stringify(JSON.parse(appState), null, 2);

        if(generateOptions)
        {
            initOptions();
        }

        scope(function(uuid)
        {
            loopInterval(function()
            {
                if(app.queuedInit !== undefined)
                {
                    app.queuedInit();

                    return false;
                }

                if(app.done && every(app.data.data, function(data)
                {
                    return data.data.length > 0;
                }, '|'))
                {
                    each(app.data.data, function(data)
                    {
                        data.data.pop();
                    });

                    app.ticks--;
                }
                else if(app.done)
                {
                    app.loop = false;
                }
                else
                {
                    app.done |= !update();
                }

                render();

                var speed = app.encoder ? 1 : app.speed;

                return app.loop ? speed : false;
            }, app.speed, function()
            {
                if(app.uuid === uuid)
                {
                    render();

                    if(app.encoder)
                    {
                        app.encoder.finish();

                        var binary_gif   = app.encoder.stream().getData(),
                            data_url     = 'data:image/gif;base64,' + encode64(binary_gif),
                            id           = 'app-preview-image-' + selectors.piContainer.children.length + 1,
                            active       = selectors.piContainer.children.length === 0 ? ' active' : '';
                            piContent    = htmlToElement('<div class="carousel-item' + active + '"> <img id="' + id + '" /><span class="centered preview-image-download" data-forward-click="#' + id + '">Download</span> </div>'),
                            previewImage = piContent.querySelector('img');

                        previewImage.src = data_url;

                        scope(function(encoder)
                        {
                            previewImage.onclick = null;
                            previewImage.onclick = function()
                            {
                                if(encoder && this.src !== null && this.src !== undefined && this.src.length > 0)
                                {
                                    var fileName = window.prompt("File Name", "download.gif");

                                    if(typeof fileName === 'string' && fileName.length > 0)
                                    {
                                        encoder.download(fileName);
                                    }
                                }
                            }
                        }, app.encoder);

                        selectors.piContainer.classList.add('enabled');
                        selectors.piContainer.parentNode.classList.add('enabled');
                        selectors.piContainer.appendChild(piContent);
                    }

                    init(app.id);
                }
            });
        }, app.uuid);
    }

    if(app === null || !app.loop)
    {
        runInit();
    }
    else
    {
        app.queuedInit = runInit;
    }
}

function dataColor()
{
    var color = app.data.colors[app.data.colorI];

    app.data.colorI = (app.data.colorI + 1) % app.data.colors.length;

    return color;
}

function getCellSize()
{
    if(app.cell.size !== '')
    {
        return parseInt(app.cell.size);
    }
    return Math.floor(app.width / app.grid.cellsX);
}

function drawCellSquare(x, y, w, h)
{
    var cellSize = getCellSize();

    app.ctx.fillStyle = app.cell.borderColor;

    app.ctx.fillRect(x - (app.data.width / 2)            , y                   , app.cell.borderWidth           , cellSize);
    app.ctx.fillRect(x + cellSize - (app.data.width / 2) , y                   , app.cell.borderWidth           , cellSize);
    app.ctx.fillRect(x - (app.data.width / 2)            , y                   , cellSize                       , app.cell.borderWidth);
    app.ctx.fillRect(x - (app.data.width / 2)            , y + cellSize        , cellSize + app.cell.borderWidth, app.cell.borderWidth);
}

function drawData(points)
{
    var cellSize        = getCellSize(),
        color           = dataColor();
    app.ctx.lineWidth   = app.data.width;
    app.ctx.strokeStyle = color;

    eachPair(points, function(point, nextPoint)
    {
        // Draws the Colored Path
        if(app.render.line)
        {
            app.ctx.beginPath();

            app.ctx.moveTo((point[0] * cellSize) + (cellSize / 2)     , ((app.grid.cellsY - 1) * cellSize) - (point[1] * cellSize) + (cellSize / 2));
            app.ctx.lineTo((nextPoint[0] * cellSize) + (cellSize / 2) , ((app.grid.cellsY - 1) * cellSize) - (nextPoint[1] * cellSize) + (cellSize / 2));
            app.ctx.stroke();
        }

        // Draws the Colored Cell
        if(app.render.data)
        {
            app.ctx.fillStyle = color;

            app.ctx.fillRect((point[0] * cellSize) , ((app.grid.cellsY - 1) * cellSize) - (point[1] * cellSize) , cellSize , cellSize);
        }
    });

    return color;
}

function drawGates(gates)
{
    var cellSize      = getCellSize();
    app.ctx.lineWidth = app.gate.width;

    each(gates, function(gate)
    {
        each({in: gate.in, out: gate.out}, function(dir, key)
        {
            app.ctx.beginPath();

            var modifier = -app.gate.width;

            switch(key)
            {
                case 'in':
                    app.ctx.strokeStyle = app.gate.inColor;
                    modifier            = app.gate.width * 0.75;
                break;

                case 'out':
                    app.ctx.strokeStyle = app.gate.outColor;
                break;
            }

            switch(dir)
            {
                case UP:
                    app.ctx.moveTo((gate.place[0] * cellSize) + (cellSize / 10) - modifier              , ((app.grid.cellsY - 1) * cellSize) - (gate.place[1] * cellSize) + (cellSize / 4) - modifier);
                    app.ctx.lineTo((gate.place[0] * cellSize) + (cellSize / 2)                          , ((app.grid.cellsY - 1) * cellSize) - (gate.place[1] * cellSize) + (cellSize / 6) - modifier);
                    app.ctx.lineTo((gate.place[0] * cellSize) + (cellSize - (cellSize / 10)) + modifier , ((app.grid.cellsY - 1) * cellSize) - (gate.place[1] * cellSize) + (cellSize / 4) - modifier);
                    app.ctx.stroke();
                break;

                case DOWN:
                    app.ctx.moveTo((gate.place[0] * cellSize) + (cellSize / 10) - modifier              , ((app.grid.cellsY - 1) * cellSize) - ((gate.place[1] - 1) * cellSize) - (cellSize / 4) + modifier);
                    app.ctx.lineTo((gate.place[0] * cellSize) + (cellSize / 2)                          , ((app.grid.cellsY - 1) * cellSize) - ((gate.place[1] - 1) * cellSize) - (cellSize / 6) + modifier);
                    app.ctx.lineTo((gate.place[0] * cellSize) + (cellSize - (cellSize / 10)) + modifier , ((app.grid.cellsY - 1) * cellSize) - ((gate.place[1] - 1) * cellSize) - (cellSize / 4) + modifier);
                    app.ctx.stroke();
                break;

                case LEFT:
                    app.ctx.moveTo((gate.place[0] * cellSize) + (cellSize / 4) - modifier , ((app.grid.cellsY - 1) * cellSize) - ((gate.place[1] - 1) * cellSize) - (cellSize / 10) + modifier);
                    app.ctx.lineTo((gate.place[0] * cellSize) + (cellSize / 6) - modifier , ((app.grid.cellsY - 1) * cellSize) - ((gate.place[1] - 1) * cellSize) - (cellSize / 2));
                    app.ctx.lineTo((gate.place[0] * cellSize) + (cellSize / 4) - modifier , ((app.grid.cellsY - 1) * cellSize) - ((gate.place[1] - 1) * cellSize) - (cellSize - (cellSize / 10)) - modifier);
                    app.ctx.stroke();
                break;

                case RIGHT:
                    app.ctx.moveTo(((gate.place[0] + 1) * cellSize) - (cellSize / 4) + modifier , ((app.grid.cellsY - 1) * cellSize) - ((gate.place[1] - 1) * cellSize) - (cellSize / 10) + modifier);
                    app.ctx.lineTo(((gate.place[0] + 1) * cellSize) - (cellSize / 6) + modifier , ((app.grid.cellsY - 1) * cellSize) - ((gate.place[1] - 1) * cellSize) - (cellSize / 2));
                    app.ctx.lineTo(((gate.place[0] + 1) * cellSize) - (cellSize / 4) + modifier , ((app.grid.cellsY - 1) * cellSize) - ((gate.place[1] - 1) * cellSize) - (cellSize - (cellSize / 10)) - modifier);
                    app.ctx.stroke();
                break;
            }
        });
    });
}

function redirect(place, dir, color)
{
    var res = false;

    each(app.gate.data, function(gate)
    {
        if(gate.place[0] === place[0] && gate.place[1] === place[1] && dir === -gate.in && (gate.hit < gate.limit && gate.recentHit < gate.recentLimit))
        {
            res = gate.out;
            gate.colors.push(color);
            gate.hit++;
            gate.recentHit++;
        }
    });

    return res;
}

function inBounds(place)
{
    return  place[0] < app.grid.cellsX && place[1] <= app.grid.cellsY &&
            place[0] >= 0 && place[1] >= 0;
}

function render()
{
    var cellSize    = getCellSize();
    app.data.colorI = 0;
    app.ctx.clearRect(0, 0, app.width, app.height);

    app.ctx.fillStyle = '#FFFFFF';
    app.ctx.fillRect(0, 0, app.width, app.height);

    if(app.render.cell)
    {
        for(var i = 0; i < app.grid.cellsX; i++)
        {
            for(var j = 0; j < app.grid.cellsY; j++)
            {
                drawCellSquare(i * cellSize, j * cellSize);
            }
        }
    }

    if(app.render.data || app.render.line)
    {
        each(app.data.data, function(data)
        {
            data.color = drawData(data.data);
        });
    }

    if(app.render.gate)
    {
        drawGates(app.gate.data);
    }

    if(app.encoder)
    {
        app.encoder.addFrame(app.ctx);
    }
}

function update()
{
    var res = false;

    each(app.data.data, function(data)
    {
        if(inBounds(data.place))
        {
            switch(data.dir)
            {
                case UP:
                    data.place = [data.place[0], data.place[1] + 1];
                break;

                case DOWN:
                    data.place = [data.place[0], data.place[1] - 1];
                break;

                case LEFT:
                    data.place = [data.place[0] - 1, data.place[1]];
                break;

                case RIGHT:
                    data.place = [data.place[0] + 1, data.place[1]];
                break;
            }

            data.data.push(data.place);

            var dir = redirect(data.place, data.dir, data.color);
            if(dir !== false)
            {
                data.dir = dir;
            }

            res = true;
        }
    });

    var rng = new RNG(app.ticks);

    if(rng.nextFloat() < app.generate.data.chanceToSpawn)
    {
        var isX   = rng.nextFloat() < 0.5,
            isMin = rng.nextFloat() < 0.5,
            rand  = Math.floor(rng.nextFloat() * (isX ? app.grid.cellsY : app.grid.cellsX) - 2) + 1,
            place = [],
            dir   = DIRS[Math.floor(rng.nextFloat() * DIRS.length)];

        if(isX)
        {
            place[0] = isMin ? 0 : app.grid.cellsX;
            place[1] = rand;
            dir      = isMin ? RIGHT : LEFT;
        }
        else
        {
            place[0] = rand;
            place[1] = isMin ? 0 : app.grid.cellsY;
            dir      = isMin ? UP : DOWN;
        }

        each(range(0, Math.floor(rng.nextFloat() * app.generate.dataCluster.min) + (app.generate.dataCluster.max - app.generate.dataCluster.min) + 1), function()
        {
            app.data.data.push({
                place : place,
                dir   : dir,
                data  : [place],
            });
        });
    }

    each(app.gate.data, function(gate)
    {
        gate.recentHit = 0;
    });

    if(!app.done)
    {
        app.ticks++;
    }

    return res;
}

function parseOption(inputTemplate, val, key, name)
{
    name = name === undefined ? key : name;
    optionEl = inputTemplate({
        type        : typeof val,
        id          : key,
        placeholder : val,
        label       : name,
    });

    selectors.appSettings.appendChild(optionEl);
}

function initOptions()
{
    selectors.appSettings.innerHTML = '';

    var stringInputTemplate = template('template-string-input'),
        options             = [
            {
                name: 'seed',
                key: 'id',
                val: app.id,
            },
            'speed',
            'captureGif',
            'generate.data.min',
            'generate.data.max',
            'generate.data.chanceToSpawn',
            'generate.dataCluster.min',
            'generate.dataCluster.max',
            'generate.gate.min',
            'generate.gate.max',
            'generate.gate.minLimit',
            'generate.gate.maxLimit',
            'generate.gate.minRecentLimit',
            'generate.gate.maxRecentLimit',
            'render.cell',
            'render.gate',
            'render.data',
            'render.line',
            'cell.size',
            'cell.borderColor',
            'cell.borderWidth',
            'data.width',
            'data.colors',
            'gate.width',
            'gate.inColor',
            'gate.outColor',
        ];

    each(options, function(key)
    {
        if(typeof key === 'object')
        {
            var obj  = key,
                val  = getVal(obj, 'val'),
                name = getVal(obj, 'name');
            key      = getVal(obj, 'key');

            parseOption(stringInputTemplate, val, key, name);
            return;
        }

        var val = getVal(app, key),
            optionEl;

        if(val instanceof Array)
        {
            each(val, function(subVal, subKey)
            {
                subKey   = key + '.' + subKey;
                parseOption(stringInputTemplate, subVal, subKey);
            });
        }
        else
        {
            parseOption(stringInputTemplate, val, key);
        }
    });
}

init();
// app.ctx.translate(app.data.width / 2, app.data.width / 4);

document.getElementById('app-generate').onclick = function()
{
    init();
}

$(document).on('change', '.app-input', function()
{
    var type = getVal(this, 'dataset.type'),
        key  = this.id,
        val  = this.value;

    if(val.length == 0)
    {
        val = this.placeholder;
    }

    if(key === 'id')
    {
        this.placeholder = val;
        this.value       = '';
        init(val);
        return;
    }

    switch(type)
    {
        case 'boolean':
            if(val === 'true' || val === '1' || val === 1)
            {
                val = true;
            }
            else
            {
                val = false;
            }
        break;
        case 'number':
            val = Number(val);
        break;
    }

    config(key, val);

    if(key === 'captureGif')
    {
        init(app.id);
    }
});

$(document).on('click', '[data-toggle-show]:not([data-toggle-show=""])', function()
{
    var target = getVal(this, 'dataset.toggleShow');

    $(target).toggleClass('hidden');
});

$(document).on('click', '[data-forward-click]:not([data-forward-click=""])', function()
{
    var target = getVal(this, 'dataset.forwardClick');

    $(target).trigger('click');
});

$(document).on('click', '[data-click="preventDefault"]', function(e)
{
    e.preventDefault();
});

//event.preventDefault();

function handleResize()
{
    var parent = selectors.canvas.parentNode,
        wOrH   = Math.min(window.innerHeight, parent.clientWidth);
        size   = wOrH - (wOrH % 5);

    selectors.canvas.width  = size;
    selectors.canvas.height = size;

    config('width', size);
    config('height', size);
}

var resizeTimeout = null;

$(window).on('resize', function()
{
    if(resizeTimeout !== null)
    {
        clearTimeout(resizeTimeout);
    }

    resizeTimeout = setTimeout(function()
    {
        handleResize();
    }, 75);
});

handleResize();

const ps = new PerfectScrollbar('#content', {
  wheelSpeed: 2,
  wheelPropagation: true
});
