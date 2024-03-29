const socketio = require('../server.js')
var User = require('./Users.js');
var Rooms = require('./RoomList.js');
var ChampionPool = require("./ChampionPool");
var HexBattlefield = require('./HexBattlefield.js');

const damagePerLoss1To4 = 2;//2
const damagePerLoss5To7 = 4;
const damagePerLoss8To9 = 6;

const processPhaseTime = 5; //5
const planningPhaseTime = 30; //30
const arrivalTime = 5; //5
const combatPhaseTime = 30; //30

const goldForLoss = 2;

const itemDrop = {
    1 : { dropRate : 0.5, maxDrop : 2, minGoldDrop : 1, gold : [2,4], minItemDrop : 1, typeItem : 'BasicItem', canDrop2Item : false },
    2 : { dropRate : 0.5, maxDrop : 4, minGoldDrop : 0, gold : [2,4], minItemDrop : 1, typeItem : 'BasicItem', canDrop2Item : false },
    5 : { dropRate : 0.5, maxDrop : 3, minGoldDrop : 0, gold : [3,6], minItemDrop : 1, typeItem : 'BasicItem', canDrop2Item : false },
    6 : { dropRate : 0.5, maxDrop : 4, minGoldDrop : 0, gold : [3,6], minItemDrop : 1, typeItem : 'BasicItem', canDrop2Item : false },
    7 : { dropRate : 1, maxDrop : 1, minGoldDrop : 1, gold : [4,8], minItemDrop : 1, typeItem : 'AdvancedItem', canDrop2Item : true },
    8 : { dropRate : 1, maxDrop : 1, minGoldDrop : 1, gold : [4,8], minItemDrop : 1, typeItem : 'AdvancedItem', canDrop2Item : true },
    9 : { dropRate : 1, maxDrop : 1, minGoldDrop : 1, gold : [4,8], minItemDrop : 1, typeItem : 'AdvancedItem', canDrop2Item : true },
}

const stages = {
    1: [
        { round: 1, mode: 'PvE', monsters: [{ monsterName: 'Melee Minion', positionX: 3, positionY: 2}, //2,1
                                            { monsterName: 'Melee Minion', positionX: 3, positionY: 4}], goldGain: 10, level: 1} //goldGain: 1 //2,3

    ],
    2: [
        { round: 1, mode: 'PvE', monsters: [{ monsterName: 'Melee Minion', positionX: 3, positionY: 2}, //2,1
                                            { monsterName: 'Melee Minion', positionX: 3, positionY: 4},
                                            { monsterName: 'Ranged Minion', positionX: 4, positionY: 1}, //2,1
                                            { monsterName: 'Ranged Minion', positionX: 4, positionY: 4}], goldGain: 20, level: 2} //goldGain: 5 //2,3
    ],
    3: [
        { round: 1, mode: 'PvP', goldGain: 20,  level: 3},//goldGain: 8 
        //{ round: 2, mode: 'PvP', goldGain: 2,  level: 3}
    ],
    4: [
        { round: 1, mode: 'PvP', goldGain: 20, level: 4},//goldGain: 6
        //{ round: 2, mode: 'PvP', goldGain: 3, level: 4}
    ],
    5: [
        { round: 1, mode: 'PvE', monsters: [{ monsterName: 'Krug', positionX: 3, positionY: 0},
                                            { monsterName: 'Krug', positionX: 3, positionY: 4},
                                            { monsterName: 'Krug', positionX: 4, positionY: 1}], goldGain: 20, level: 5},//goldGain: 7 
        { round: 2, mode: 'PvP', goldGain: 20, level: 5}//goldGain: 4 
    ],
    6: [
        { round: 1, mode: 'PvE', monsters: [{ monsterName: 'Murk Wolf', positionX: 3, positionY: 2},
                                            { monsterName: 'Murk Wolf', positionX: 3, positionY: 4},
                                            { monsterName: 'Murk Wolf', positionX: 4, positionY: 1},
                                            { monsterName: 'Murk Wolf', positionX: 4, positionY: 4} ,], goldGain: 12, level: 6},
        { round: 2, mode: 'PvP', goldGain: 20, level: 6},//goldGain: 5 
        //{ round: 3, mode: 'PvP', goldGain: 5, level: 6}
    ],
    7: [
        { round: 1, mode: 'PvE', monsters: [{ monsterName: 'Blue Sentinel', positionX: 3, positionY: 3}], goldGain: 16, level: 7},
        { round: 1, mode: 'PvP', goldGain: 16, level: 7},
        //{ round: 2, mode: 'PvP', goldGain: 7, level: 7},
        //{ round: 3, mode: 'PvP', goldGain: 7, level: 7}
    ],
    8: [
        { round: 1, mode: 'PvE', monsters: [{ monsterName: 'Red Brambleback', positionX: 3, positionY: 3}], goldGain: 17, level: 8},
        { round: 2, mode: 'PvP', goldGain: 10, level: 8},
        //{ round: 3, mode: 'PvP', goldGain: 10, level: 8}
    ],
    9: [
        { round: 1, mode: 'PvE', monsters: [{ monsterName: 'Dragon', positionX: 3, positionY: 3}], goldGain: 10, level: 9},
        { round: 2, mode: 'PvP', goldGain: 10, level: 9},
        { round: 3, mode: 'PvP', goldGain: 10, level: 9},
        { round: 5, mode: 'PvP', goldGain: 10, level: 9},
        { round: 4, mode: 'PvP', goldGain: 10, level: 9},
    ],
}

function updateScoreboard(_roomName){
    let scoreboard = Rooms.getPlayerListWithHpSort1(_roomName);
    var leaderboard = [];
    for(let player of scoreboard){
        player.place = scoreboard.indexOf(player);
        let data = {};
        data._username = player.username;
        data._profileImage = player.profileImage;
        data._hp = player.hp;
        data._maxhp = player.maxhp;
        data._place = player.place;
        data._battlefield = player.battlefield;
        leaderboard.push(data);
    }
    socketio.EmitToAllClientsInRoom(_roomName, "update-scoreboard", JSON.stringify(leaderboard));
    return leaderboard;
}

function takeDamage(_player, _damage){
    console.log("takeDamage: " + _damage);
    _player.hp -= _damage;
    if(_player.hp <= 0)
        return true;
    return false;
}

function countdownTimer(_roomName, _time){
    let countdownTime = _time;
    let counter = setInterval(function(){
        countdownTime--;
        socketio.EmitToAllClientsInRoom(_roomName, 'countdownTimer', [countdownTime, _time-1]);
        if (countdownTime === 0) {
            clearInterval(counter);
        }
    }, 1000);
    return counter;
}

async function processBattlePhase(_roomName, _nowStage, _nowRound, _battlefieldListDone, _playerListWithHPLess0){
    console.log("processBattle");
    let countdown = countdownTimer(_roomName, processPhaseTime);
    let nextPhase = setTimeout(function(){
        planningPhase(_roomName, _nowStage, _nowRound);
    }, processPhaseTime * 1000);
    let playerListWithHPLess0 = [];
    if(_playerListWithHPLess0){
        playerListWithHPLess0 = _playerListWithHPLess0;
    }
    if(_battlefieldListDone != null){
        //kiểm tra còn trận đấu nào chưa kết thúc => tính là thua và trừ máu của cả Đội chủ nhà và đội khách
        let battlefieldList = Rooms.getBattlefieldList(_roomName);
        let damage;
        switch(_nowStage){
            case 1:
            case 2:
            case 3:
            case 4:
                damage = damagePerLoss1To4; break;
            case 5:
            case 6:
            case 7:
                damage = damagePerLoss5To7; break;
            case 8:
            case 9:
                damage = damagePerLoss8To9; break;
        }
        for(var battle of battlefieldList){
            if(!_battlefieldListDone.includes(battle)){
                console.log("battle.name: " + battle.hexBattlefieldName);
                console.log("damage: " + damage);
                let playerHome = Rooms.getPlayer(_roomName, battle.home);
                let playerAway;
                if(battle.away != "PvE")
                    playerAway = Rooms.getPlayer(_roomName, battle.away);
                socketio.EmitToClient(playerHome.socketid, "deal-damage-to-opponent", [playerAway.username,String(damage)] );
                if(battle.away != "PvE"){
                    socketio.EmitToClient(playerAway.socketid, "deal-damage-to-opponent", [playerHome.username,String(damage)] );
                }
                socketio.EmitToClient(playerHome.socketid, "take-damage-from-opponent", damage);
                if(takeDamage(playerHome, damage) == true){
                    playerListWithHPLess0.push(playerHome);
                    socketio.EmitToClient(playerHome.socketid, "on-dead");
                }
                if(battle.away != "PvE"){
                    socketio.EmitToClient(playerAway.socketid, "take-damage-from-opponent", damage);
                    if(takeDamage(playerAway, damage) == true){
                        playerListWithHPLess0.push(playerAway);
                        socketio.EmitToClient(playerAway.socketid, "on-dead");
                    }
                }
            }
        }
    }
    //reset battlefield
    Rooms.resetBattlefield(_roomName);
    //cập nhật bảng xếp hạng
    var scoreboard = updateScoreboard(_roomName);
    if(playerListWithHPLess0){
        for (let i = 0; i < playerListWithHPLess0.length; i++) {
            let player = Rooms.getPlayer(_roomName, playerListWithHPLess0[i].username);
            let addPoint = 0;
            switch(player.place){
                case 0:
                    addPoint = 20; break;
                case 1:
                    addPoint = 10; break;
                case 2:
                    addPoint = -15; break;
                case 3:
                    addPoint = -30; break;
                // case 4:
                //     addPoint = -5; break;
                // case 5:
                //     addPoint = -10; break;
                // case 6:
                //     addPoint = -15; break;
                // case 7:
                //     addPoint = -20; break;
            }
            var user = await User.findOne({username : player.username}).exec();
            if(user != null){
                user.points += addPoint;
                if(user.points < 0){
                    user.points = 0;
                }
                if(user.points <= 100){
                    user.rank = "Bronze";
                }
                else if(100 < user.points && user.points <= 200){
                    user.rank = "Silver";
                }
                else if(200 < user.points && user.points <= 300){
                    user.rank = "Gold";
                }
                else if(300 < user.points && user.points <= 400){
                    user.rank = "Platinum";
                }
                else if(400 < user.points && user.points <= 600){
                    user.rank = "Diamond";
                }
                else if(600 < user.points && user.points <= 800){
                    user.rank = "Master";
                }
                else if(800 < user.points && user.points <= 1000){
                    user.rank = "Grandmaster";
                }
                else if(1000 < user.points){
                    user.rank = "Challenger";
                }
                user.save((e) => {
                    if(e) console.log(e);
                })
            }
            socketio.EmitToClient(playerListWithHPLess0[i].socketid, "end-game", [player.place.toString(), user.rank, user.points.toString(), addPoint.toString(), JSON.stringify(scoreboard)]);
        }
    }
    var playerListWithHPGreater0 = (Rooms.getPlayerList(_roomName) || []).filter(function(x){ return x.hp > 0; });
    if(playerListWithHPGreater0.length == 0){
        console.log("playerListWithHPGreater0.length == 0");
        clearInterval(countdown)
        clearTimeout(nextPhase);
    }
    if(playerListWithHPGreater0.length == 1){
        console.log("playerListWithHPGreater0.length == 1");
        clearInterval(countdown)
        clearTimeout(nextPhase);
        //socketio.EmitToClient(playerListWithHPGreater0[0].socketid, "end-game", playerListWithHPGreater0[0].place);
        let player = Rooms.getPlayer(_roomName, playerListWithHPGreater0[0].username);
        let addPoint = 0;
        switch(player.place){
            case 0:
                addPoint = 20; break;
            case 1:
                addPoint = 15; break;
            case 2:
                addPoint = 10; break;
            case 3:
                addPoint = 5; break;
            case 4:
                addPoint = -5; break;
            case 5:
                addPoint = -10; break;
            case 6:
                addPoint = -15; break;
            case 7:
                addPoint = -20; break;
        }
        var user = await User.findOne({username : player.username}).exec();
        if(user != null){
            user.points += addPoint;
            if(user.points < 0){
                user.points = 0;
            }
            if(user.points <= 100){
                user.rank = "Bronze";
            }
            else if(100 < user.points && user.points <= 200){
                user.rank = "Silver";
            }
            else if(200 < user.points && user.points <= 300){
                user.rank = "Gold";
            }
            else if(300 < user.points && user.points <= 400){
                user.rank = "Platinum";
            }
            else if(400 < user.points && user.points <= 600){
                user.rank = "Diamond";
            }
            else if(600 < user.points && user.points <= 800){
                user.rank = "Master";
            }
            else if(800 < user.points && user.points <= 1000){
                user.rank = "Grandmaster";
            }
            else if(1000 < user.points){
                user.rank = "Challenger";
            }
            user.save((e) => {
                if(e) console.log(e);
            })
        }
        socketio.EmitToClient(playerListWithHPGreater0[0].socketid, "end-game", [player.place.toString(), user.rank, user.points.toString(), addPoint.toString(), JSON.stringify(scoreboard)]);
    }
}

async function planningPhase(_roomName, _nowStage, _nowRound){
    if(_nowStage != 0 || _nowRound != 0){
        socketio.EmitToAllClientsInRoom(_roomName, "back-to-home");
    }
    socketio.EmitToAllClientsInRoom(_roomName, "reset-battlefield", true);
    //let item = await socketio.GetItemDrop1("frozen_heart");
    // let item1 = await socketio.GetItemDrop1("tear_of_the_goddess");
    // socketio.EmitToAllClientsInRoom(_roomName, "get-item-drop", JSON.stringify(item));
    // socketio.EmitToAllClientsInRoom(_roomName, "get-item-drop", JSON.stringify(item1));
    console.log("planningPhases");
    if(_nowStage == 0){
        _nowStage++;
    }
    else{
        if(_nowRound < stages[_nowStage].length - 1){
            _nowRound++;
        }
        else{
            _nowStage++;
            _nowRound = 0;
            //tăng 1 cấp và thêm 1 slot ra trận cho tất cả người chơi
            socketio.UpgradeLevelAllPlayer(_roomName);
        }
    }
    //tự động upgrade các unit nếu đủ điều kiện
    //socketio.UpgradeUnit(_roomName);
    //thay đổi phase: planning phase cho phép người chơi chỉnh sửa đội hình trên sàn đấu
    socketio.EmitToAllClientsInRoom(_roomName, "change-phase", "PlanningPhase");
    //round mới
    socketio.EmitToAllClientsInRoom(_roomName, 'new-round', [_nowStage, _nowRound+1]);
    //reset lại item (reset stack buff)
    //socketio.EmitToAllClientsInRoom(_roomName, "reset-items-on-unit", true);
    //thêm vàng cho tất cả người chơi
    socketio.AddGoldAllPlayer(_roomName, stages[_nowStage][_nowRound].goldGain);
    //cập nhật tỉ lệ roll tướng cho tất cả người chơi
    await socketio.UpdateRerollProbabilityAllPlayer(_roomName, stages[_nowStage][_nowRound].level);
    //làm mới unit shop cho tất cả người chơi
    await socketio.RefreshUnitShopAllPlayer(_roomName);
    var playerListWithHPGreater0 = (Rooms.getPlayerList(_roomName) || []).filter(function(x){ return x.hp > 0; });
    for(let player of playerListWithHPGreater0){
        player.phase = "PlanningPhase";
    }
    countdownTimer(_roomName, planningPhaseTime);
    setTimeout(function(){
        arrivalPhase(_roomName, _nowStage, _nowRound);
    }, planningPhaseTime * 1000);
}

async function arrivalPhase(_roomName, _nowStage, _nowRound){
    //socketio.EmitToAllClientsInRoom(_roomName, "reset-battlefield", true);
    console.log("arrivalPhase");
    //thay đổi phase: combat phase không cho phép người chơi chỉnh sửa đội hình trên sàn đấu 
    socketio.EmitToAllClientsInRoom(_roomName, "change-phase", "CombatPhase");
    //khóa và lấy thông tin đội hình từ người chơi
    var playerListWithHPGreater0 = (Rooms.getPlayerList(_roomName) || []).filter(function(x){ return x.hp > 0; });
    for(let player of playerListWithHPGreater0){
        player.phase = "ArrivalPhase";
        socketio.LockFormationAtCombatPhase(_roomName, player.username);
    }
    //nếu là round đấu với Quái vật (nhận thêm vàng và trang bị)
    if(stages[_nowStage][_nowRound].mode == "PvE"){
        //gửi thông tin đói thủ là PvE cho tất cả người chơi trong phòng
        socketio.EmitToAllClientsInRoom(_roomName, "set-opponent", "PvE");
        let playerListShuffle = Rooms.getPlayerListShuffle(_roomName);
        for(let i = 0; i < playerListShuffle.length; i++){
            var fomationMonsters = {};
            let monstersList = [];
            let monstersPositionList = [];
            let itemDropList = [];
            let coinDropList = [];
            console.log(_roomName + ": "+ _nowStage + " - " + _nowRound);
            //lấy danh sách quái vật
            for(var monster of stages[_nowStage][_nowRound].monsters){
                let unit = await ChampionPool.findOne({championName: monster.monsterName }).lean();
                unit._id = Math.random().toString(36).substring(2);
                unit.currentLevel = unit.level[0]; 
                unit.owner = "PvE";
                //danh sách quái vật và dữ liệu lấy từ database
                monstersList.push(JSON.stringify(unit));
                //danh sách vị trí quái vật sẽ xuất hiện trên sàn đấu
                //monstersPositionList.push((HexBattlefield.rowsBattlefield - 1 - monster.positionX).toString()+","+(HexBattlefield.columnBattlefield - 1 - monster.positionY).toString());
                monstersPositionList.push(monster.positionX.toString()+","+monster.positionY.toString());
                //vị trí đội hình của Quái vật trên sàn đấu
                fomationMonsters[monster.positionX.toString()+","+ monster.positionY.toString()] = unit;
            }
            let minGoldDrop = itemDrop[_nowStage].minGoldDrop;
            let minItemDrop = itemDrop[_nowStage].minItemDrop;
            for (let j = 0; j < itemDrop[_nowStage].maxDrop; j++) {
                if(itemDrop[_nowStage].canDrop2Item){
                    let item = await socketio.GetItemDrop(itemDrop[_nowStage].typeItem);
                    itemDropList.push(JSON.stringify(item));
                    coinDropList.push("coin");
                    console.log("canDrop2Item: " + item);
                }
                else{
                    if(minItemDrop > 0){
                        let item = await socketio.GetItemDrop(itemDrop[_nowStage].typeItem);
                        console.log("minItemDrop > 0: " + item.name);
                        itemDropList.push(JSON.stringify(item));
                        coinDropList.push(null);
                        minItemDrop--;
                    }
                    else if(minGoldDrop > 0){
                        console.log("minCoinDrop > 0: ");
                        coinDropList.push("coin");
                        itemDropList.push(null);
                        minGoldDrop--;
                    }
                    else{
                        let dropRate = (Math.random() * (1 - 0) + 0).toFixed(2);
                        if(dropRate <= itemDrop[_nowStage].dropRate){
                            let itemRate = (Math.random() * (1 - 0) + 0).toFixed(2);
                            if(itemRate <= 0.5){
                                let item = await socketio.GetItemDrop(itemDrop[_nowStage].typeItem);
                                itemDropList.push(JSON.stringify(item));
                                coinDropList.push(null);
                            }
                            else{
                                itemDropList.push(null);
                                coinDropList.push("coin");
                            }
                        }
                        else{
                            itemDropList.push(null);
                            coinDropList.push(null);
                        }
                    }
                }
            }

            //set thông tin đội hình của từng người chơi và quái vật lên cùng sàn đấu riêng biệt (mỗi người chơi + quái vật = 1 sàn đấu => 8 sàn đấu)
            Rooms.setBattlefield(_roomName, "Battlefield_"+i, playerListShuffle[i].username, "PvE", playerListShuffle[i].battlefield, fomationMonsters);
            //gửi thông tin sàn đấu cho từng người chơi
            socketio.EmitToClient(playerListShuffle[i].socketid, "set-battlefield", "Battlefield_"+i);

            socketio.EmitToClient(playerListShuffle[i].socketid, "round-PvE", [monstersList, monstersPositionList, itemDropList, coinDropList]);
        }
        //gửi thông tin quái vật và khởi tạo cho tất cả người chơi trong phòng
        //socketio.EmitToAllClientsInRoom(_roomName, "round-PvE", [monstersList, monstersPositionList, itemDropList, coinDropList]);
    }
    //nếu là round đấu với người chơi khác
    else{
        //var playerListWithHPGreater0 = (playerList || []).filter(function(x){ return x.hp > 0; }).sort(() => Math.random() - 0.5);
        let playerListShuffle = Rooms.getPlayerListShuffle(_roomName);
        const numberPlayersOnBattlefield = 2;
        let matchPair = new Array(Math.ceil(playerListShuffle.length / numberPlayersOnBattlefield)).fill().map(x => playerListShuffle.splice(0, numberPlayersOnBattlefield));
        // for(var i of matchPair){
        //     if(i.length % 2 == 0){
        //         socketio.EmitToClient(i[0].socketid, "set-opponent", i[1].username);
        //         socketio.EmitToClient(i[1].socketid, "set-opponent", i[0].username);
        //         socketio.EmitToClient(i[1].socketid, "arrival-to-opponent", i[0].username);

        //         Rooms.setBattlefield("Battlefield_"+)
        //     }
        //     else{
        //         //
        //     }
        // }
        for(let i = 0; i < matchPair.length; i++){
            if(matchPair[i].length % 2 == 0){
                Rooms.setBattlefield(_roomName, "Battlefield_"+i, matchPair[i][0].username, matchPair[i][1].username, matchPair[i][0].battlefield, matchPair[i][1].battlefield);
                socketio.EmitToClient(matchPair[i][0].socketid, "set-opponent", matchPair[i][1].username);
                socketio.EmitToClient(matchPair[i][1].socketid, "set-opponent", matchPair[i][0].username);
                socketio.EmitToClient(matchPair[i][1].socketid, "arrival-to-opponent", matchPair[i][0].username);
                
                socketio.EmitToClient(matchPair[i][0].socketid, "set-battlefield", "Battlefield_"+i);
                socketio.EmitToClient(matchPair[i][1].socketid, "set-battlefield", "Battlefield_"+i);
            }
            else{
                socketio.EmitToClient(i[0].socketid, "opponent", i[1].username);
            }
        }
    }
    countdownTimer(_roomName, arrivalTime);
    setTimeout(function(){
        combatPhase(_roomName, _nowStage, _nowRound);
    }, arrivalTime * 1000);
}

function combatPhase(_roomName, _nowStage, _nowRound){
    console.log("combatPhase");
    let countdown = countdownTimer(_roomName, combatPhaseTime);
    let battlefieldList = Rooms.getBattlefieldList(_roomName);
    let battlefieldListDone = [];
    let playerListWithHPLess0 = [];
    let nextPhase = setTimeout(function(){
        socketio.EmitToAllClientsInRoom(_roomName, "set-end-combat");
        clearInterval(checkResultBattle);
        processBattlePhase(_roomName, _nowStage, _nowRound, battlefieldListDone);
    }, combatPhaseTime * 1000);
    socketio.EmitToAllClientsInRoom(_roomName, "set-start-combat");
    var playerListWithHPGreater0 = (Rooms.getPlayerList(_roomName) || []).filter(function(x){ return x.hp > 0; });
    for(let player of playerListWithHPGreater0){
        player.phase = "CombatPhase";
        socketio.ActiveTraits(player, true);
    }
    socketio.EmitToAllClientsInRoom(_roomName, "active-traits-success", true);
    let checkResultBattle = setInterval(function(){
        for(var battle of battlefieldList){
            if(!battlefieldListDone.includes(battle)){
                if(battle.home == null && battle.away == null){
                    console.log("battle.home == null && battle.away == null: " +battle.hexBattlefieldName);
                    battlefieldListDone.push(battle);
                    continue;
                }
                //console.log("!battlefieldListDone.includes(battle): " +battle.hexBattlefieldName);
                let homeStillHaveUnit = false;
                let awayStillHaveUnit = false;
                //kiểm tra unit còn tồn tại trên "Sân đấu" của Đội chủ nhà và Đội khách
                for(let i = 0; i < HexBattlefield.rowsBattlefield; i++){
                    if (!homeStillHaveUnit && battle.hexBattlefield[i].find(x => x.unit != null && x.unit.owner == battle.home) !== undefined)
                        homeStillHaveUnit = true;
                    if (!awayStillHaveUnit && battle.hexBattlefield[i].find(x => x.unit != null && x.unit.owner == battle.away) !== undefined)
                        awayStillHaveUnit = true;
                    if(homeStillHaveUnit && awayStillHaveUnit)
                        break;
                }
                //nếu 1 bên đã hết unit hoặc cả 2 bên đều hết unit cùng lúc => kết thúc trận đấu
                if((homeStillHaveUnit != awayStillHaveUnit) || (!homeStillHaveUnit && !awayStillHaveUnit)){
                    if(homeStillHaveUnit != awayStillHaveUnit)
                        console.log("battlefieldListDone: " +battle.hexBattlefieldName + "  " + battle.home +" homeStillHaveUnit != awayStillHaveUnit");
                    if(!homeStillHaveUnit && !awayStillHaveUnit){
                        console.log("battlefieldListDone: " +battle.hexBattlefieldName + "  " + battle.home + " !homeStillHaveUnit && !awayStillHaveUnit");
                    }
                    
                    battlefieldListDone.push(battle);
                    let playerHome = Rooms.getPlayer(_roomName, battle.home);
                    let playerAway;
                    if(battle.away != "PvE")
                        playerAway = Rooms.getPlayer(_roomName, battle.away);
                    let damage;
                    switch(_nowStage){
                        case 1:
                        case 2:
                        case 3:
                        case 4:
                            damage = damagePerLoss1To4; break;
                        case 5:
                        case 6:
                        case 7:
                            damage = damagePerLoss5To7; break;
                        case 8:
                        case 9:
                            damage = damagePerLoss8To9; break;
                    }
                    socketio.EmitToClient(playerHome.socketid, "set-end-combat");
                    if(battle.away != "PvE"){
                        socketio.EmitToClient(playerAway.socketid, "set-end-combat");
                    }
                    //nếu Đội chủ nhà không còn unit => là đội thua
                    if(!homeStillHaveUnit){
                        //nếu Đội khách là PvE thì bỏ qua hoạt ảnh tấn công của Đội khách
                        if(battle.away != "PvE"){
                            socketio.EmitToClient(playerAway.socketid, "deal-damage-to-opponent", [playerHome.username,String(damage)] );   
                        }
                        socketio.EmitToClient(playerHome.socketid, "take-damage-from-opponent", damage);
                        if(takeDamage(playerHome, damage) == true){
                            playerListWithHPLess0.push(playerHome);
                            socketio.EmitToClient(playerHome.socketid, "on-dead");
                        }

                    }
                    //nếu Đội chủ nhà không còn unit => là đội thua
                    if(!awayStillHaveUnit){
                        //nếu Đội khách là PvE thì bỏ qua việc gây/nhận sát thương
                        if(battle.away != "PvE"){
                            socketio.EmitToClient(playerHome.socketid, "deal-damage-to-opponent", [playerAway.username,String(damage)] );
                            socketio.EmitToClient(playerAway.socketid, "take-damage-from-opponent", damage);
                            if(takeDamage(playerAway, damage) == true){
                                playerListWithHPLess0.push(playerAway);
                                socketio.EmitToClient(playerAway.socketid, "on-dead");
                            }
                        }
                    }
                    //cập nhật bảng xếp hạng
                    updateScoreboard(_roomName);
                }
            }
        }
        if(battlefieldListDone.length == battlefieldList.length){
            console.log("allBattleDone");
            socketio.EmitToAllClientsInRoom(_roomName, "set-end-combat");
            processBattlePhase(_roomName, _nowStage, _nowRound, battlefieldListDone, playerListWithHPLess0);
            clearInterval(countdown)
            clearTimeout(nextPhase);
            clearInterval(checkResultBattle);
        }
    }, 1);
}
class Stage {
    constructor(_roomName) {
        this.roomName = _roomName;
        this.nowStage = 0;
        this.nowRound = 0;
    }
    
    startBattle() {
        planningPhase(this.roomName, this.nowStage, this.nowRound);
    }
}

module.exports = Stage;