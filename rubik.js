/* global $,Solver,console,window */

class Rubik {
    
    constructor() {
        this.$rubik = $('#rubik');
        this.$wheel = $('<div>');
        this.size = 3;
        this.width = 300;
        this.center = this.width / 2;
        this.cellwidth = this.width / this.size;
        this.data = [];
        this.solver = new Solver(this.data);
        this.$btns = {
            solve: $('#btnSolve'),
            manual: $('#btnManual'),
            shuffle: $('#btnShuffle'),
            edit: $('#btnEdit'),
            seethrough: $('#btnSeeThrough')
        };
        this.solving = false;
        this.shuffleing = false;
        this.manualing = false;
        this.editing = false;     
        this.init();
    }

    px(index) {
        return `${index * this.cellwidth}px`;
    }

    arrayToObj(items, names) {
        const result = {};
        for (let index=0; index<items.length; index++) {
            result[names[index]] = items[index];
        }
        return result;
    }

    addSide($cell, x, y, z, axis, axisrot) {
        const trans = `translate3D(${this.px(x)},${this.px(y)},-${this.px(z)})`,
            rot = `rotate${axis}(${axisrot}deg)`,
            $side = $('<div>')
                .addClass('side')
                .css({
                    width: this.cellwidth + 1,
                    height: this.cellwidth + 1,
                    transform: `${trans} ${rot}`
                });
        $cell.append($side);
        return $side;
    }

    addHandle($color, axis, index, vert, dir, edge) {
        const angle = (vert ? 0 : -90) + (edge < 0 ? 0 : 180),
            $handle = $('<div>').data({ axis: axis, index: index, dir: dir }),
            posCss = {
                top:  this.cellwidth/2 - 20,
                left: this.cellwidth/2 - 20,
                transform: `rotate(${angle}deg)`
            };
        posCss[vert ? 'top' : 'left'] = edge < 0 ? 6 : this.cellwidth-46;
        $handle
            .addClass('handle')
            .css(posCss)
            .click(this.onHandleClick.bind(this));
        $color.append($handle);
    }

    addCell(x, y, z, sides) {
        const $cell = $('<div>')
            .addClass('cell')
            .css('transform-origin', `${this.center}px ${this.center}px -${this.center}px`);
        const parts = [
            [y===0, x,     y-0.5, z+0.5, 'X',  90, 'white' ], // 0 top
            [y===2, x,     y+0.5, z+0.5, 'X', -90, 'yellow'], // 1 bottom
            [x===0, x-0.5, y,     z+0.5, 'Y', -90, 'orange'], // 2 left
            [x===2, x+0.5, y,     z+0.5, 'Y',  90, 'red'   ], // 3 right
            [z===0, x,     y,     z,     'Y',   0, 'green' ], // 4 front
            [z===2, x,     y,     z+1.0, 'Y', 180, 'blue'  ]  // 5 back
        ];
        for (let iPart=0; iPart<6; iPart++) {
            const part = this.arrayToObj(
                parts[iPart], 
                ['outer', 'x', 'y', 'z', 'axis', 'axisrot', 'color', 'handles', 'vertAxis']
            );
            // side
            const $side = this.addSide($cell, part.x, part.y, part.z, part.axis, part.axisrot);
            const sideinfo = {$side: $side};
            if (part.outer) {
                // color
                const $color = $('<div>').addClass(`color ${part.color}`);
                $side.append($color);
                sideinfo.$color = $color;
                sideinfo.colorClass = part.color;
            }
            sides.push(sideinfo);
        }
        this.$rubik.append($cell);
        return $cell;
    }

    addHandles() {
        const sideHandles = [ // axis, plusaxis, plusindex, vert, edge
            [[0, 2, 2, true, -1], [2, 0, 2, false,  1]], // top
            [[0, 2, 0, true, -1], [2, 0, 0, false, -1]], // bottom
            [[1, 2, 0, false, 1], [2, 1, 0, true,  -1]], // left
            [[1, 2, 2, false, 1], [2, 1, 2, true,   1]], // right
            [[0, 1, 0, true, -1], [1, 0, 2, false,  1]], // front
            [[0, 1, 2, true,  1], [1, 0, 0, false,  1]]  // back
        ];
        for (let index=0; index<this.data.length; index++) {
            const $cell = this.data[index];
            const pos = $cell.pos;
            for (let iSide=0; iSide<6; iSide++) {
                if ($cell.sides[iSide].hasOwnProperty('$color')) {
                    const handles = sideHandles[iSide];
                    for (let iHandle=0; iHandle<handles.length; iHandle++) {
                        const handle = this.arrayToObj(
                            handles[iHandle], 
                            ['axis', 'plusAxis', 'plusIndex', 'vert', 'edge']
                        );
                        if (pos[handle.plusAxis] !== 1) {
                            const $color = $cell.sides[iSide].$color;
                            const dir = pos[handle.plusAxis] === handle.plusIndex ? 1 : -1;
                            this.addHandle($color, handle.axis, pos[handle.axis], handle.vert, dir, handle.edge * dir);
                        }
                    }
                }
            }
        }
    }

    rotateSides(axis, index, direction) {
        const cells = this.data.filter(item => item.pos[axis] === index),
            slice0 = [[],[],[]],
            slice1 = [[],[],[]],
            turnAxes = [[1,2],[0,2],[0,1]][axis];
        // compensate original coordinate system
        if (axis === 0) {
            direction *= -1;
        }
        // slice sideview
        for (let iCell=0; iCell<cells.length; iCell++) {
            const cell = cells[iCell];
            slice0[cell.pos[turnAxes[1]]][cell.pos[turnAxes[0]]] = cell;
        }
        // rotate slice
        for (let y=0; y<3; y++) {
            for (let x=0; x<3; x++) {
                if (direction === 1) {
                    slice1[y][x] = slice0[x][2-y];
                } else {
                    slice1[y][x] = slice0[2-x][y];
                }
            }
        }
        const sideMap = [[0,4,1,5],[4,3,5,2],[0,3,1,2]][axis],
            newClasses = [];
        // calulate side color changes
        for (let y=0; y<3; y++) {
            for (let x=0; x<3; x++) {
                const cell0 = slice0[y][x];
                const cell1 = slice1[y][x];
                // for cell0.side[n].color -> cell1.side[sidemap[n+-1].color]
                for (let sideIndex0=0; sideIndex0<6; sideIndex0++) {
                    const side0 = cell0.sides[sideIndex0];
                    if (side0.hasOwnProperty('$color')) {
                        // change sides or stay in place
                        const mapIndex0 = sideMap.indexOf(sideIndex0),
                            sideDir = direction > 0 ? 1 : 3,
                            sideIndex1 = mapIndex0 === -1 ? sideIndex0 : sideMap[(mapIndex0 + sideDir) % 4];
                        // to prevent overwrites, only store first, update later
                        const side1 = cell1.sides[sideIndex1];
                        if (side1.hasOwnProperty('$color')) {
                            newClasses.push({side: side1, remove: side1.colorClass, add: side0.colorClass });
                        }
                    }
                }
            }
        }
        // update color classes
        for (let y=0; y<newClasses.length; y++) {
            const newClass = newClasses[y];
            newClass.side.$color.removeClass(newClass.remove).addClass(newClass.add);
            newClass.side.colorClass = newClass.add;
        }
    }

    rotate(axis, index, direction, duration, onReady) {
        const cells = this.data
                .filter(item => item.pos[axis] === index)
                .map(item => item.$cell[0]),
            $cells = $(cells),
            axisCh = 'xyz'.charAt(axis),
            animTo = {};
        let reverted = false;
        animTo[axisCh] = direction * 90;
        $cells.animate(animTo, {
            duration: duration,
            step: (now, tween) => {
                if (!reverted) {
                    $cells.css('transform', `rotate${tween.prop.toUpperCase()}(${now}deg)`);
                }
            },
            done: () => {
                if (!reverted) {
                    reverted = true;
                    animTo[axisCh] = 0;
                    $cells.animate(animTo, 0).css('transform', '');
                    this.rotateSides(axis, index, direction);
                    if (onReady) { 
                        onReady(); 
                    }
                }
            }
        });
    }

    makeSteps(steps, onReady) {
        let index = 0;
        const norm = this.solver.normalizeSteps(steps),
            step = () => {
                const onReadyOrNot = index === norm.length-1 ? onReady : undefined;
                this.rotate(norm[index][0], norm[index][1], norm[index][2], 400, onReadyOrNot);
                index += 1;
                if (index < norm.length) {
                    window.setTimeout(step, 500);
                }
            };
        step();
    }

    solveAll(onReady) {
        const steps = this.solver.next();
        if (this.solving && steps.length > 0) {
            this.makeSteps(steps, () => {
                window.setTimeout(() => this.solveAll(onReady), 500);
            });
        } else if (onReady) {
            onReady();
        }
    }
    
    randomizeStep(times, axis, onReady) {
        const index = Math.floor(Math.random()*3),
            direction = Math.floor(Math.random()*2) === 0 ? 1 : -1;
        axis = (axis + 1 + Math.floor(Math.random()*2)) % 3;
        this.rotate(axis, index, direction, 300);
        if (this.shuffleing && times > 0) {
            window.setTimeout(() => this.randomizeStep(times - 1, axis, onReady), 350);
        } else if (onReady) {
            onReady();
        }        
    }
    
    randomize(times, onReady) {
        this.shuffleing = true;
        this.randomizeStep(times, 0, onReady);
    }

    setBtnSub($btn, subtitle) {
        $btn.find('.navsubtitle').text(subtitle);
    }

    disableOtherBtns($btn) {
        for (const name in this.$btns) {
            if (this.$btns.hasOwnProperty(name)) {
                const disabled = this.$btns[name] !== $btn && name !== 'seethrough';
                this.$btns[name].toggleClass('disabled', disabled);
            }
        }
    }

    onSolveReady() {
        this.solving = false;
        this.setBtnSub(this.$btns.solve, 'Watch how the program solves the cube.');
        $('.navitem').removeClass('inprogress disabled');        
        this.$rubik.addClass('done');
        window.setTimeout(() => this.$rubik.removeClass('done'), 2100);
    }

    onSolve() {
        if (this.$btns.solve.hasClass('disabled')) {
            return;
        }
        if (!this.solving) {
            this.solving = true;
            this.$btns.solve.addClass('inprogress');
            this.disableOtherBtns(this.$btns.solve);
            this.setBtnSub(this.$btns.solve, 'Click again to stop, or wait until it\'s finished.');
            this.solveAll(this.onSolveReady.bind(this));
        } else {
            this.setBtnSub(this.$btns.solve, 'Finishing last combo...');
            this.solving = false;
        }
    }

    onShuffleReady() {
        this.shuffleing = false;
        this.setBtnSub(this.$btns.shuffle, 'Make random turns to shuffle the cube.');
        $('.navitem').removeClass('inprogress disabled');
    }

    onShuffle() {
        if (this.$btns.shuffle.hasClass('disabled')) {
            return;
        }
        if (!this.shuffleing) {
            this.shuffleing = true;
            this.$btns.shuffle.addClass('inprogress');
            this.disableOtherBtns(this.$btns.shuffle);
            this.setBtnSub(this.$btns.shuffle, 'Click again to stop, or wait until it\'s finished.');
            this.randomize(50, () => this.onShuffleReady());
        } else {
            this.onShuffleReady();
        }
    }

    onSeeThrough() {
        this.$rubik.toggleClass('seethrough');
        this.$btns.seethrough.toggleClass('checked');
    }

    onHandleClick(event) {
        let data;
        if (this.manualing) {
            data = $(event.target).data();
            this.$rubik.removeClass('handles');
            this.makeSteps([[data.axis, data.index, data.dir]], () => this.$rubik.addClass('handles'));
        }
    }

    onManual() {
        if (this.$btns.manual.hasClass('disabled')) {
            return;
        }
        if (!this.manualing) {
            this.manualing = true;
            this.disableOtherBtns(this.$btns.manual);
            this.setBtnSub(this.$btns.manual, 'Click again to exit.');
        } else {
            this.manualing = false;
            $('.navitem').removeClass('disabled');
            this.setBtnSub(this.$btns.manual, 'Try to solve the cube yourself.');

        }
        this.$rubik.toggleClass('handles');
        this.$btns.manual.toggleClass('checked');
    }

    onColorEnter(event) {
        const $color = $(event.target),
            currentColor = $color[0].className.split(' ')[1];
        if (this.editing) {
            this.$wheel.find('.wheelcolor').removeClass('current');
            this.$wheel.find(`.wheelcolor.${currentColor}`).addClass('current');
            $color.append(this.$wheel);
            this.$wheel.show();
        }
    }

    onColorLeave() {
        this.$wheel.hide();
    }

    onWheelColorClick(event) {
        const $wheelColor = $(event.target),
            $color = this.$wheel.closest('.color'),
            $cell = $color.closest('.cell'),
            oldColor = $color[0].className.split(' ')[1],
            newColor = $wheelColor[0].className.split(' ')[1];
        $color.removeClass(oldColor).addClass(newColor);
        this.$wheel.find('.wheelcolor').removeClass('current');
        this.$wheel.find(`.wheelcolor.${newColor}`).addClass('current');
        // update data
        const info = this.data.filter(item => item.$cell[0] === $cell[0])[0];
        const side = info.sides.filter(side => side.colorClass === oldColor)[0];
        side.colorClass = newColor;
    }

    createWheel() {
        const colors = ['red', 'orange', 'green', 'blue', 'white', 'yellow'];
        this.$wheel.addClass('wheel');
        for (let index=0; index<colors.length; index++) {
            const $color = $('<div>')
                .css('transform', `rotate(${60 * index}deg)`)
                .addClass(`wheelcolor ${colors[index]}`);
            $color.click(this.onWheelColorClick.bind(this));
            this.$wheel.append($color);
        }
        $('.color').hover(
            this.onColorEnter.bind(this), 
            this.onColorLeave.bind(this)
        );
    }

    onEdit() {
        if (this.$btns.edit.hasClass('disabled')) {
            return;
        }
        if (!this.editing) {
            this.editing = true;
            this.disableOtherBtns(this.$btns.edit);
            this.setBtnSub(this.$btns.edit, 'Click again to stop.');
        } else {
            this.editing = false;
            $('.navitem').removeClass('disabled');
            this.setBtnSub(this.$btns.edit, 'Set the cube into a specific state.');
        }
        this.$btns.edit.toggleClass('checked');
    }

    initTrackball() {
        const dragtarget = $('body'),
            sensitivity = 0.5, 
            limitX = 30;              
        let active = false,
            startX, startY, 
            nextX, nextY, nextZ,
            rotX = -20, rotY = 25, rotZ = 0;
        dragtarget.mousedown(event => {
            // ignore if it's a button or other non-dragging click
            if ($(event.target).closest('.navitem, .handle, .wheelcolor').length) {
                return;
            }            
            startX = event.screenX;
            startY = event.screenY;
            active = true;
        });
        dragtarget.mousemove(event => {
            if (active) {                
                const endX = event.screenX;
                const endY = event.screenY;
                // delta
                const yaw   = Math.round((endX - startX) * sensitivity);
                const pitch = Math.round((endY - startY) * sensitivity);
                const roll  = 0;
                // new rotation
                nextX = rotX - pitch;
                nextY = rotY + yaw;
                nextZ = rotZ + roll;
                // limit X to avoid pole singularities
                nextX = Math.max(-limitX, Math.min(limitX, nextX));
                // set
                this.$rubik.css({
                    transform: `rotateX(${nextX}deg) rotateY(${nextY}deg) rotateZ(${nextZ}deg)`
                });
            }
        });
        const onDragEnd = () => {
            if (active) {
                active = false;
                rotX = nextX;
                rotY = nextY;
                rotZ = nextZ;                
            }
        };
        dragtarget.mouseleave(onDragEnd);
        dragtarget.mouseup(onDragEnd);        
    }
    
    init() {
        for (let z=0; z<3; z++) {
            for (let y=0; y<3; y++) {
                for (let x=0; x<3; x++) {
                    const sides = [],
                        $cell = this.addCell(x, y, z, sides);
                    this.data.push({
                        pos: [x, y, z],
                        $cell: $cell,
                        sides: sides
                    });
                }
            }
        }
        this.addHandles();
        this.createWheel();
        this.$rubik.css({
            width: this.width,
            height: this.width, // intentionally 'width'.
            'transform-origin': `50% 50% -${this.center}px`
        });
        this.initTrackball();
        // buttons
        this.$btns.solve.click(this.onSolve.bind(this));
        this.$btns.manual.click(this.onManual.bind(this));
        this.$btns.shuffle.click(this.onShuffle.bind(this));
        this.$btns.edit.click(this.onEdit.bind(this));
        this.$btns.seethrough.click(this.onSeeThrough.bind(this));
    }

}

// start
new Rubik();
