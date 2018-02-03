/* global window,console */

class Solver {
    
    constructor(data) {
        this.data = data;
    }

    everySideColorIsRequested(sides, colors) {
        return sides.every(side => colors.indexOf(side.colorClass) !== -1);
    }
    
    cellByColors(colors) {
        const colorCount = colors.length;
        // check all cells
        for (let iCell=0; iCell<this.data.length; iCell++) {
            const cell = this.data[iCell];
            // cell sides that has colors
            const sides = cell.sides.filter(side => side.hasOwnProperty('colorClass'));
            // cell has the exact number of colored sides
            if (sides.length === colorCount && this.everySideColorIsRequested(sides, colors)) {
                return cell;
            }
        }
        throw 'Cell not found';
    }

    cellByPos(pos) {
        // check all cells
        for (let iCell=0; iCell<this.data.length; iCell++) {
            const cell = this.data[iCell];
            if (this.posEqual(pos, cell.pos)) {
                return cell;
            }
        }
        throw 'Cell not found';
    }

    posEqual(pos1, pos2) {
        return (
            pos1[0] === pos2[0] &&
            pos1[1] === pos2[1] &&
            pos1[2] === pos2[2]
        );
    }

    normalizeSteps(steps) {
        const norm = [];
        for (let iStep=0; iStep<steps.length; iStep++) {
            const step = steps[iStep];
            const rep = Math.abs(step[2]);
            const dir = step[2] < 0 ? -1 : 1;
            for (let iRep=0; iRep<rep; iRep++) {
                norm.push([step[0], step[1], dir]);
            }
        }
        return norm;
    }

    oppositeSide(side) {
        return [1,0,3,2,5,4][side];
    }

    // convert front view position to other views
    posMap(pos, side) {
        if (side === 0) {
            // top
            pos = [pos[0], pos[2], pos[1]];
        } else if (side === 1) {
            // bottom
            pos = [pos[0], 2-pos[2], pos[1]];
        } else if (side === 2) {
            // left
            pos = [2-pos[2], pos[1], pos[0] ];
        } else if (side === 3) {
            // right
            pos = [pos[2], pos[1], 2-pos[0] ];
        } else if (side === 5) {
            // back
            pos = [2-pos[0], pos[1], 2-pos[2] ];
        }
        // side 4 is ignored (pos=pos)
        return pos;
    }

    // convert rotations back from any view to front view
    rotMapBack(rots, side) {
        const result = [];
        for (let iRot=0; iRot<rots.length; iRot++) {
            const rot = rots[iRot];
            const axis = rot[0];
            const index = rot[1];
            const dir = rot[2];
            let axisM, indexM, dirM;
            if (side === 4) {
                // front - no change
                axisM = axis;
                indexM = index;
                dirM = dir;
            } else if (side === 0) {
                // top
                axisM = [0,2,1][axis];
                indexM = [index,2-index,index][axis];
                dirM = dir * [1,1,-1][axis];
            } else if (side === 1) {
                // bottom
                axisM = [0,2,1][axis];
                indexM = [index,index,2-index][axis];
                dirM = dir * [1,-1,1][axis];
            } else if (side === 2) {
                // left
                axisM = [2,1,0][axis];
                indexM = [2-index,index,index][axis];
                dirM = dir * [1,1,-1][axis];
            } else if (side === 3) {
                // right
                axisM = [2,1,0][axis];
                indexM = [index,index,2-index][axis];
                dirM = dir * [-1,1,1][axis];
            } else if (side === 5) {
                // back
                axisM = [0,1,2][axis];
                indexM = [2-index,index,2-index][axis];
                dirM = dir * [-1,1,-1][axis];
            }
            result.push([axisM, indexM, dirM]);
        }
        return result;
    }

    // white center
    state1() {
        const cell = this.cellByColors(['white']),
            pos = cell.pos;
        if (!this.posEqual(pos,[1,0,1])) {
            console.log('state 1', pos);
            if (pos[0] !== 1) {
                return [[2, 1, 1-pos[0]]];
            }
            if (pos[1] === 2) {
                return [[0, 1, 2]];
            }
            if (pos[2] !== 1) {
                return [[0, 1, 1-pos[2]]];
            }
        }
        return [];
    }

    // side centers
    state2() {
        const cell = this.cellByColors(['green']),
            pos = cell.pos;
        if (!this.posEqual(pos,[1,1,0])) {
            console.log('state 2', pos);
            if (pos[0] !== 1) {
                return [[1, 1, 1-pos[0]]];
            }
            if (pos[2] !== 0) {
                return [[1, 1, 2]];
            }
        }
        return [];
    }

    // white plus (green,red,blue,orange)
    state3() {
        const sides = [
            ['green',  4],
            ['red',    3],
            ['blue',   5],
            ['orange', 2]
        ];
        for (let side=0; side<4; side++) {
            const steps = this.state3sub(sides[side][0], sides[side][1]);
            if (steps.length > 0) {
                return steps;
            }
        }
        return [];
    }

    // one part of the white plus
    state3sub(color, side) {
        const cell = this.cellByColors(['white', color]),
            pos = this.posMap(cell.pos, side),
            posOk = this.posEqual(pos, [1,0,0]),
            rotOk = cell.sides[0].colorClass === 'white';
        if (posOk && !rotOk) {
            console.log('state 3 rot', pos, color);
            return this.rotMapBack([[2, 0, 2]], side);
        }
        if (!posOk) {
            console.log('state 3 pos', pos, color);
            if (pos[2] === 2 && pos[1] !== 2) {
                return this.rotMapBack([[2, pos[2], [-1,2,1][pos[0]] ]], side);
            }
            if (pos[0] !== 1 && pos[1] !== 2) {
                return this.rotMapBack([[0, pos[0], [-1,2,1][pos[2]] ]], side);
            }
            if (pos[1] === 2 && pos[2] !== 0) {
                return this.rotMapBack([[1, 2, [1,2,-1][pos[0]] ]], side);
            }
            if (pos[2] === 0 && pos[1] !== 0) {
                if (cell.sides[side].colorClass === 'white') {
                    return this.rotMapBack([[1,2,-1], [0,1,-1], [1,2,1], [0,1,1]], side);
                } else {
                    return this.rotMapBack([[2, 0, [1,2,-1][pos[0]] ]], side);
                }
            }
        }
        return [];
    }

    // state4: white corners
    state4() {
        const sides = [
            ['green',  'orange', 4],
            ['red',    'green',  3],
            ['blue',   'red',    5],
            ['orange', 'blue',   2]
        ];
        for (let iSide=0; iSide<4; iSide++) {
            const steps = this.state4sub(sides[iSide][0], sides[iSide][1], sides[iSide][2]);
            if (steps.length > 0) {
                return steps;
            }
        }
        return [];
    }

    // one white corner
    state4sub(color1, color2, side) {
        const cell = this.cellByColors(['white', color1, color2]),
            pos = this.posMap(cell.pos, side),
            posOk = this.posEqual(pos, [0,0,0]),
            topColor = cell.sides[0].colorClass,
            rotOk = topColor === 'white';
        if (posOk && !rotOk) {
            if (topColor === color1) {
                return this.rotMapBack([[0,0,-1], [1,2,1], [1,2,1], [0,0,1], [2,0,-1], [1,2,-2], [2,0,1]], side);
            } else {
                return this.rotMapBack([[2,0,-1], [1,2,-2], [2,0,1], [0,0,-1], [1,2,2], [0,0,1]], side);

            }
        }
        if (!posOk) {
            // top layer
            if (pos[1] === 0) {
                return this.rotMapBack([
                    [0, pos[0], pos[2] === 0 ? -1 : 1],
                    [1, 2, 1],
                    [0, pos[0], pos[2] === 0 ? 1 : -1]
                ], side);
            }
            // bottom layer
            if (pos[1] === 2) {
                let steps = [];
                if (pos[2] === 0) {
                    steps.push([1, 2, pos[0] === 0 ? -1 : 1 ]);
                } else if (pos[2] === 2 && pos[0] === 2) {
                    steps.push([1, 2, 1]);
                }
                steps = steps.concat([[2,0,-1], [1,2,1], [2,0,1]]);
                return this.rotMapBack(steps, side);
            }
        }
        return [];
    }

    // state 5: middle layer
    state5() {
        const sides = [
            ['green',  'orange', 4, 2],
            ['red',    'green',  3, 4],
            ['blue',   'red',    5, 3],
            ['orange', 'blue',   2, 5]
        ];
        for (let iSide=0; iSide<4; iSide++) {
            const steps = this.state5sub(sides[iSide][0], sides[iSide][1], sides[iSide][2], sides[iSide][3]);
            if (steps.length > 0) {
                return steps;
            }
        }
        return [];
    }

    // one middle edge
    state5sub(color1, color2, side1, side2) {
        const cell = this.cellByColors([color1, color2]),
            frontColor = cell.sides[side1].colorClass,
            leftSteps = [[1,2,1], [0,0,-1], [1,2,-1], [0,0,1], [1,2,-1], [2,0,-1], [1,2,1], [2,0,1]],
            rightSteps = [[1,2,-1], [0,2,-1], [1,2,1], [0,2,1], [1,2,1], [2,0,1], [1,2,-1], [2,0,-1]];            
        let frontSide, destPos;            
        // choose a front side
        if (frontColor === color1) {
            frontSide = side1;
            destPos = [0,1,0];
        } else {
            frontSide = side2;
            destPos = [2,1,0];
        }
        let pos = this.posMap(cell.pos, frontSide),
            dirSteps = pos[0] === 0 ? leftSteps : rightSteps,
            steps = [];
        const posOk = this.posEqual(pos, destPos);
        if (!posOk) {
            // middle layer -> bottom
            if (pos[1] === 1) {
                // if it's on the back, we turn around
                if (pos[2] === 2) {
                    console.log('state5sub middle backside');
                    frontSide = this.oppositeSide(frontSide);
                    pos = this.posMap(cell.pos, frontSide);
                    dirSteps = pos[0] === 0 ? leftSteps : rightSteps;
                    return this.rotMapBack(dirSteps, frontSide);
                }
                console.log('state5sub middle frontside');
                return this.rotMapBack(dirSteps, frontSide);
            }
            // bottom layer -> dest
            if (pos[1] === 2) {
                console.log('state5sub bottom');
                if (pos[2] !== 0) {
                    // turn to bottom-front
                    steps.push([1, 2, [1,2,-1][pos[0]]]);
                }
                if (destPos[0] === 0) {
                    // left edge
                    steps = steps.concat(leftSteps);
                } else {
                    // right edge
                    steps = steps.concat(rightSteps);
                }
                return this.rotMapBack(steps, frontSide);
            }
        }
        // turn in place
        if (posOk && frontColor !== color1) {
            console.log('state5sub turn');
            steps = steps.concat(dirSteps).concat([[1,2,2]]).concat(dirSteps);
            return this.rotMapBack(steps, frontSide);
        }
        return [];
    }

    // bottom edges
    state6() {
        let side, pos, cell;
        const sides = [
            ['green',  4, [1,2,0]],
            ['red',    3, [2,2,1]],
            ['blue',   5, [1,2,2]],
            ['orange', 2, [0,2,1]]
        ];
        // current/destination order
        const destOrder = sides.map(item => item[0]);
        let currentOrder = [];
        for (let iSide=0; iSide<4; iSide++) {
            side = sides[iSide][1];
            pos = sides[iSide][2];
            cell = this.cellByPos(pos);
            let color = cell.sides[side].colorClass;
            if (color === 'yellow') {
                color = cell.sides[1].colorClass;
            }
            currentOrder[iSide] = color;
        }
        // best rotation
        let maxMatchIndex = 0;
        const orderFilter = (value, index) => value === destOrder[index],
            matches = [];
        for (let dir=0; dir<4; dir++) {
            const match = currentOrder.filter(orderFilter).length;
            matches.push(match);
            if (match > matches[maxMatchIndex]) {
                maxMatchIndex = dir;
            }
            currentOrder = currentOrder.splice(3,1).concat(currentOrder);
        }
        // if there is better
        if (maxMatchIndex !== 0) {
            console.log('state6 bottom best rotation');
            return [[1,2, [0,1,2,-1][maxMatchIndex]]];
        }
        // not all in place
        let indexOrder, pos1, pos2, pos1M, pos2M, frontSide;
        if (matches[maxMatchIndex] < 4) {
            console.log('state6 bottom edge replace');
            indexOrder = currentOrder.map(item => destOrder.indexOf(item));
            // first step of a sort
            for (let iSide=0; iSide<3; iSide++) {
                if (indexOrder[iSide] > indexOrder[iSide+1]) {
                    pos1 = this.cellByColors(['yellow', currentOrder[iSide]]).pos;
                    pos2 = this.cellByColors(['yellow', currentOrder[iSide+1]]).pos;
                    break;
                }
            }
            // find view 2..5
            for (let iSide=2; iSide<6; iSide++) {
                pos1M = this.posMap(pos1, iSide);
                pos2M = this.posMap(pos2, iSide);
                if ((this.posEqual(pos1M, [0,2,1]) && this.posEqual(pos2M, [1,2,2])) ||
                    (this.posEqual(pos2M, [0,2,1]) && this.posEqual(pos1M, [1,2,2]))) {
                    frontSide = iSide;
                }
            }
            return this.rotMapBack([[1,2,1], [2,2,-1], [0,2,1], [1,2,1], [0,2,-1], [1,2,-1], [2,2,1]], frontSide);
        }
        // rotate in place
        indexOrder = [];
        for (let iSide=0; iSide<4; iSide++) {
            side = sides[iSide][1];
            pos = sides[iSide][2];
            cell = this.cellByPos(pos);
            indexOrder[iSide] = cell.sides[1].colorClass === 'yellow';
        }
        if (indexOrder.indexOf(false) !== -1) {
            // first step of a sort
            for (let iSide=0; iSide<3; iSide++) {
                if (!indexOrder[iSide]) {
                    pos1 = sides[iSide][2];
                    pos2 = sides[iSide+1][2];
                    console.log('state6 turn in place', pos1, pos2);
                    break;
                }
            }
            // find view 2..5
            for (let iSide=2; iSide<6; iSide++) {
                pos1M = this.posMap(pos1, iSide);
                pos2M = this.posMap(pos2, iSide);
                if ((this.posEqual(pos1M, [2,2,1]) && this.posEqual(pos2M, [1,2,2])) ||
                    (this.posEqual(pos2M, [2,2,1]) && this.posEqual(pos1M, [1,2,2]))) {
                    frontSide = iSide;
                }
            }
            return this.rotMapBack([
                [0,2, 1], [1,1,-1], [0,2,2], [1,1,-2], [0,2, 1], 
                [1,2,-1], [0,2,-1], [1,1,2], [0,2,-1], [0,2,-1], 
                [1,1, 1], [0,2,-1], [1,2,1]], frontSide);
        }
        return [];
    }

    // bottom corners
    state7() {
        const turnUpSteps = [
                [0,0, 1], [1,0,-1], [0,0,-1], [2,0,1],
                [1,0,-1], [2,0,-1], [1,2,-1], [2,0,1],
                [1,0, 1], [2,0,-1], [0,0, 1], [1,0,1],
                [0,0,-1], [1,2, 1]
            ],
            turnOutSteps = [
                [1,2,-1], [0,0, 1], [1,0,-1], [0,0,-1],
                [2,0, 1], [1,0,-1], [2,0,-1], [1,2, 1],
                [2,0, 1], [1,0, 1], [2,0,-1], [0,0, 1],
                [1,0, 1], [0,0,-1]
            ];
        let lastOk, colors, destPos, cell, frontSide,
            side, sideColor, pos1, pos2, cell1, cell2, 
            frontColor1, frontColor2, bottomColor1, bottomColor2,
            lastWrongPair, lastWrongSingle,
            posOk = true,
            parts = [
                [['green',  'orange'], [0,2,0], 4],
                [['red',    'green' ], [2,2,0], 3],
                [['blue',   'red'   ], [2,2,2], 5],
                [['orange', 'blue'  ], [0,2,2], 2]
            ];
        // check placement
        for (let iPart=0; iPart<4; iPart++) {
            colors  = parts[iPart][0].concat(['yellow']);
            destPos = parts[iPart][1];
            cell = this.cellByColors(colors);
            if (!this.posEqual(cell.pos, destPos)) {
                posOk = false;
            } else {
                lastOk = iPart;
            }
        }
        // turn 3 bad corner
        if (!posOk) {
            console.log('state7 turn 3 bad corners');
            frontSide = lastOk !== undefined ? parts[lastOk][2] : 4;
            return this.rotMapBack([
                [0,2,-1], [1,2,1], [0,0,-1], [1,2,-1],
                [0,2, 1], [1,2,1], [0,0, 1], [1,2,-1]
            ], frontSide);
        }
        // check rotation
        parts = [
            [4, 'green',  [0,2,0], [2,2,0]],
            [3, 'red',    [2,2,0], [2,2,2]],
            [5, 'blue',   [2,2,2], [0,2,2]],
            [2, 'orange', [0,2,2], [0,2,0]]
        ];
        for (let iPart=0; iPart<4; iPart++) {
            side = parts[iPart][0];
            sideColor = parts[iPart][1];
            pos1 = parts[iPart][2];
            pos2 = parts[iPart][3];
            cell1 = this.cellByPos(pos1);
            cell2 = this.cellByPos(pos2);
            // both frontsides are yelow
            frontColor1 = cell1.sides[side].colorClass;
            frontColor2 = cell2.sides[side].colorClass;
            if (frontColor1 === 'yellow' && frontColor2 === 'yellow') {
                console.log('state7 2 yellow (up)');
                return this.rotMapBack(turnUpSteps, side);
            }
            // both bottom sides are side-color
            bottomColor1 = cell1.sides[1].colorClass;
            bottomColor2 = cell2.sides[1].colorClass;
            if (bottomColor1 === sideColor && bottomColor2 === sideColor) {
                console.log('state7 2 other color (out)');
                return this.rotMapBack(turnOutSteps, side);
            }
            // if they aren't wrong the same way
            if (bottomColor1 !== 'yellow' && bottomColor2 !== 'yellow') {
                // both wrong
                lastWrongPair = side;
            } else if (bottomColor1 !== 'yellow' || bottomColor2 !== 'yellow') {
                // one wrong
                lastWrongSingle = side;
            }
        }
        // do the best partial
        side = lastWrongPair !== undefined ? lastWrongPair : lastWrongSingle;
        if (side !== undefined) {
            console.log('state7 2 partial (out)');
            return this.rotMapBack(turnOutSteps, side);
        }
        console.log('done.');
        return [];
    }

    next() {
        const states = ['state1', 'state2', 'state3', 'state4', 'state5', 'state6', 'state7'];
        for (let iState=0; iState<states.length; iState++) {
            const steps = this[states[iState]]();
            if (steps.length > 0) {
                return steps;
            }
        }
        return [];
    }

    rotMapTest(axis,index,side) {
        return this.rotMapBack([[axis,index,1], [axis,index,-1]], side);
    }

}
