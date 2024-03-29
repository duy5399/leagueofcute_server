const maxhpDefault = 20;
const levelDefault = 1;
const goldDefault = 10;
const goldRefreshUnitShopDefault = 2;
const lockedUnitShopDefault = false;
const maxUnitInBenchDefault = 9;
const maxUnitInBattlefieldDefault = 1;
const rowBench = 1;
const colBench = 9;
const rowBattlefield = 3;
const colBattlefield = 6;

class PlayerStat {
    constructor(username, profileImage, socketid, place) {
        this.username = username;
        this.profileImage = profileImage;
        this.socketid = socketid;
        this.maxhp = maxhpDefault;
        this.hp = maxhpDefault;
        this.level = levelDefault;
        this.gold = goldDefault;
        this.place = place;
        this.rerollProbability = null;
        this.unitShop = null;
        this.goldRefreshUnitShop = goldRefreshUnitShopDefault;
        this.lockedUnitShop = lockedUnitShopDefault;   
        this.bench = null;
        this.battlefield = null;
        this.formation = null;
        this.maxUnitInBench = maxUnitInBenchDefault;
        this.maxUnitInBattlefield = maxUnitInBattlefieldDefault;
        this.loadingComplete = false;
        this.phase = null;
    }

    set username(username) { this._username = username; }
    get username() { return this._username; }

    set profileImage(profileImage) { this._profileImage = profileImage; }
    get profileImage() { return this._profileImage; }

    set socketid(socketid) { this._socketid = socketid; }
    get socketid() { return this._socketid; }

    set hp(hp) { this._hp = hp; }   
    get hp() { return this._hp; }

    set maxhp(maxhp) { this._maxhp = maxhp; }   
    get maxhp() { return this._maxhp; }

    set level(level) { this._level = level; }   
    get level() { return this._level; }

    set gold(gold) { this._gold = gold; }   
    get gold() { return this._gold; }

    set place(place) { this._place = place; }   
    get place() { return this._place; }

    set rerollProbability(rerollProbability) { this._rerollProbability = rerollProbability; }   
    get rerollProbability() { return this._rerollProbability; }

    set unitShop(unitShop) { this._unitShop = unitShop; }   
    get unitShop() { return this._unitShop; }

    removeUnitOnUnitShop(_slot){
        delete this.unitShop[_slot];
    }

    set goldRefreshUnitShop(goldRefreshUnitShop) { this._goldRefreshUnitShop = goldRefreshUnitShop; }   
    get goldRefreshUnitShop() { return this._goldRefreshUnitShop; }

    set lockedUnitShop(lockedUnitShop) { this._lockedUnitShop = lockedUnitShop; }   
    get lockedUnitShop() { return this._lockedUnitShop; }

    set bench(bench) { this._bench = bench; }   
    get bench() { return this._bench; }

    addUnitOnBench(_unit) {
        for(let i = 0; i < rowBench; i++){
            for(let j = 0; j < colBench; j++){
                if(!(this.bench || {}).hasOwnProperty("slot"+i+"_"+j) ){
                    if(this.bench == null)
                        this.bench = {};
                    this.bench["slot"+i+"_"+j] = _unit;
                    const result = {
                        slot : "slot"+i+"_"+j,
                        unit : _unit
                    };
                    return result;
                }
            }
        }
        return null;
    }

    removeUnitOnBench(_unit) {
        for(var i in this.bench) {
            if(this.bench[i]._id == _unit._id && this.bench[i].championName == _unit.championName){
                delete this.bench[i];
                return i;
            }
        }
        return null;
    }

    set maxUnitInBench(maxUnitInBench) { this._maxUnitInBench = maxUnitInBench; }
    get maxUnitInBench() { return this._maxUnitInBench; }

    set battlefield(battlefield) { this._battlefield = battlefield; }   
    get battlefield() { return this._battlefield; }

    addUnitInBattlefield(_unit) {
        for(let i = 0; i < rowBattlefield; i++){
            for(let j = 0; j < colBattlefield; j++){
                if(!(this.battlefield || {}).hasOwnProperty("slot"+i+"_"+j) ){
                    if(this.battlefield == null)
                        this.battlefield = {};
                    this.battlefield["slot"+i+"_"+j] = _unit;
                    const result = {
                        slot : "slot"+i+"_"+j,
                        unit : _unit
                    };
                    return result;
                }
            }
        }
        return null;
    }
    removeUnitOnBattlefield(_unit) {
        for(var i in this.battlefield) {
            if(this.battlefield[i]._id == _unit._id && this.battlefield[i].championName == _unit.championName) {
                delete this.battlefield[i];
                return i;
            }
        }
        return null;
    }

    set maxUnitInBattlefield(maxUnitInBattlefield) { this._maxUnitInBattlefield = maxUnitInBattlefield; }
    get maxUnitInBattlefield() { return this._maxUnitInBattlefield; }

    set formation(formation) { this._formation = formation; }
    get formation() { return this._formation; }
     
    changePosition(oldPosition, newPosition){
        this._formation[newPosition] = this._formation[oldPosition] ;
        this._formation[oldPosition] = null;
    }

    set loadingComplete(loadingComplete) { this._loadingComplete = loadingComplete; }
    get loadingComplete() { return this._loadingComplete; }

    set phase(phase) { this._phase = phase; }   
    get phase() { return this._phase; }
};

module.exports = PlayerStat;