const rowsBattlefield = 6;
const columnBattlefield = 6;

class HexBattlefield {
    constructor(hexBattlefieldName) {
        this.hexBattlefieldName = hexBattlefieldName;
        let newHexBattlefield = [];
        for(let i = 0; i < rowsBattlefield; i++){
            newHexBattlefield[i] = [];
            for(let j = 0; j < columnBattlefield; j++){
                var hexNode = new HexNode(i, j);
                newHexBattlefield[i][j] = hexNode;
            }
        }
        this.hexBattlefield = newHexBattlefield;
        this.home = null;
        this.away = null;
    }

    set hexBattlefieldName(hexBattlefieldName){ this._hexBattlefieldName = hexBattlefieldName }
    get hexBattlefieldName() { return this._hexBattlefieldName; }

    set hexBattlefield(hexBattlefield){ this._hexBattlefield = hexBattlefield }
    get hexBattlefield() { return this._hexBattlefield; }

    set home(home){ this._home = home }
    get home() { return this._home; }

    set away(away){ this._away = away }
    get away() { return this._away; }

    getHexNode(unit){
        for(let i = 0; i < rowsBattlefield; i++){
            for(let j = 0; j < columnBattlefield; j++){
                if(this.hexBattlefield[i][j].unit != null){
                    if(this.hexBattlefield[i][j].unit.championName == unit.championName && this.hexBattlefield[i][j].unit._id == unit._id)
                        return this.hexBattlefield[i][j];
                }
            }
        }
        return null;
    }

    getHexNode1(championName, _id){
        for(let i = 0; i < rowsBattlefield; i++){
            for(let j = 0; j < columnBattlefield; j++){
                if(this.hexBattlefield[i][j].unit != null){
                    if(this.hexBattlefield[i][j].unit.championName == championName && this.hexBattlefield[i][j].unit._id == _id)
                        return this.hexBattlefield[i][j];
                }
            }
        }
        return null;
    }

    setUnit(i, j,unit){
        this.hexBattlefield[i][j].unit = unit;
    }

    setIsWalkable(i, j, bool){
        this.hexBattlefield[i][j].isWalkable = bool;
    }
    
    resetHexBattlefield() {
        for(let i = 0; i < rowsBattlefield; i++){
            for(let j = 0; j < columnBattlefield; j++){
                this.hexBattlefield[i][j] = new HexNode(i,j);
            }
        }
    }

    getDistanceBetweenTwoNodes(startNode, targetNode){
        return getDistanceBetweenTwoNodes(startNode, targetNode);
    }
    
    findShortestPath(startNode, targetNode){
        return findPath(this.hexBattlefield, startNode, targetNode);
    }
}

class HexNode{
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.gCost;
        this.hCost;
        this.fCost;
        this.isWalkable = true;
        this.unit = null;
        this.cameFromNode;
    }
    set x(x){ this._x = x }
    get x() { return this._x; }

    set y(y){ this._y = y }
    get y() { return this._y; }

    set gCost(gCost) { this._gCost = gCost; }
    get gCost() { return this._gCost; }

    set hCost(hCost) { this._hCost = hCost; }
    get hCost() { return this._hCost; }

    get fCost() { return this.gCost + this.hCost; }

    set isWalkable(bool) { this._isWalkable = bool; }
    get isWalkable() { return this._isWalkable; }

    set unit(unit) { this._unit = unit; }
    get unit() { return this._unit; }

    set cameFromNode(cameFromNode) { this._cameFromNode = cameFromNode; }
    get cameFromNode() { return this._cameFromNode; }
}

function findPath(hexMap, startNode, tartgetNode){
    let openList = [startNode];
    let closedList = [];

    while(openList.length > 0)
    {
        let currentNode = getLowestFCostNode(openList);
        if (currentNode == tartgetNode)
            return shortestPath(startNode, tartgetNode);

        openList = openList.filter(node => node != currentNode)
        closedList.push(currentNode);

        for(let neighbourNode of getNeighbourList(hexMap, currentNode))
        {
            if ((!neighbourNode.isWalkable && neighbourNode != tartgetNode) || closedList.includes(neighbourNode))
                continue;
            let newTentativeGCostToNeighbour = currentNode.gCost + getDistanceBetweenTwoNodes(currentNode, neighbourNode);
            if(!openList.includes(neighbourNode) || newTentativeGCostToNeighbour < neighbourNode.gCost)
            {
                neighbourNode.cameFromNode = currentNode;
                neighbourNode.gCost = newTentativeGCostToNeighbour;
                neighbourNode.hCost = getDistanceBetweenTwoNodes(neighbourNode, tartgetNode);
                if(!openList.includes(neighbourNode))
                    openList.push(neighbourNode);
            }
        }
    }
    return null;
}

function getLowestFCostNode(pathNodeList){
    let lowestFCostNode = pathNodeList[0];
    for(let i = 1; i < pathNodeList.length; i++)
    {
        if (pathNodeList[i].fCost < lowestFCostNode.fCost || pathNodeList[i].fCost == lowestFCostNode.fCost && pathNodeList[i].hCost < lowestFCostNode.hCost)
            lowestFCostNode = pathNodeList[i];
    }
    return lowestFCostNode;
}

function getDistanceBetweenTwoNodes(nodeA, nodeB){
    let dx = nodeB.x - nodeA.x;
    let dy = nodeB.y - nodeA.y;
    let x = Math.abs(dx);
    let y = Math.abs(dy);
    if ((dy < 0) ^ ((nodeA.x & 1) == 1))
        y = Math.max(0, y - (x / 2));
    else
        y = Math.max(0, y - (x + 1) / 2);
    return x + y;
}

function getNeighbourList(hexMap, currentNode){
    let neighbourList = [];
    //Right Up
    if(currentNode.x + 1 < rowsBattlefield)
    {
        if (currentNode.x % 2 != 0)
            neighbourList.push(hexMap[currentNode.x + 1][currentNode.y]);
        else
        {
            if (currentNode.y + 1 < columnBattlefield)
                neighbourList.push(hexMap[currentNode.x + 1][currentNode.y + 1]);
        }
    }
    //Left Up
    if (currentNode.x + 1 < rowsBattlefield)
    {
        if (currentNode.x % 2 == 0)
           neighbourList.push(hexMap[currentNode.x + 1][currentNode.y]);
        else
        {
            if( currentNode.y > 0)
                neighbourList.push(hexMap[currentNode.x + 1][currentNode.y - 1]);
        }
    }
    //Right
    if (currentNode.y + 1 < columnBattlefield)
        neighbourList.push(hexMap[currentNode.x][currentNode.y + 1]);
    //Left
    if (currentNode.y - 1 >= 0)
        neighbourList.push(hexMap[currentNode.x][currentNode.y - 1]);
    //Right Down
    if (currentNode.x - 1 >= 0)
    {
        if (currentNode.x % 2 != 0)
            neighbourList.push(hexMap[currentNode.x - 1][currentNode.y]);
        else
        {
            if (currentNode.y + 1 < columnBattlefield)
                neighbourList.push(hexMap[currentNode.x - 1][currentNode.y + 1]);
        }
    }
    //Left Down
    if (currentNode.x - 1 >= 0)
    {
        if (currentNode.x % 2 == 0)
            neighbourList.push(hexMap[currentNode.x - 1][currentNode.y]);
        else
        {
            if (currentNode.y > 0)
                neighbourList.push(hexMap[currentNode.x - 1][currentNode.y - 1]);
        }
    }
    return neighbourList;
}

function shortestPath(startNode, endNode){
    let path = [];
    let currentNode = endNode;
    while(currentNode != startNode)
    {
        path.push(currentNode);
        currentNode = currentNode.cameFromNode;
    }
    path.reverse();
    return path;
}

module.exports = HexBattlefield;
module.exports.rowsBattlefield = rowsBattlefield;
module.exports.columnBattlefield = columnBattlefield;