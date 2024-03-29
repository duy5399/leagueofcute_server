var PlayerStat = require('./PlayerStat.js');
var HexBattlefield = require('./HexBattlefield.js');

var RoomList = {};
const maxPlayerInRoom = 2;
module.exports = {
    deleteRoom : function(roomName){
        delete RoomList[roomName];
    },
    //player
    addPlayer : function(roomName, username, profileImage, socketid, place){
        var newPlayer = new PlayerStat(username, profileImage, socketid, place);
        let dataPlayers = [];
        try{
            if(RoomList[roomName].hasOwnProperty('Players'))
                dataPlayers = RoomList[roomName].Players;
        }
        catch{
            RoomList[roomName] = {};
            RoomList[roomName].Players = [];
        }
        dataPlayers.push(newPlayer);
        RoomList[roomName].Players = dataPlayers;
        return newPlayer;
    },
    getPlayer: function(roomName, username){
        return RoomList[roomName].Players.find((x) => { return x.username == username; });
    },
    getPlayerList: function(roomName){
        return RoomList[roomName].Players;
    },
    getPlayerListShuffle: function(roomName){
        return RoomList[roomName].Players.filter((x) => { return x.hp > 0; }).sort(() => Math.random() - 0.5);
    },
    getPlayerListWithHpSort : function(roomName){
        return RoomList[roomName].Players.filter((x) => { return x.hp > 0; }).sort((a, b) => b.hp-a.hp);
    },
    getPlayerListWithHpSort1 : function(roomName){
        return RoomList[roomName].Players.sort((a, b) => b.hp-a.hp);
    },

    //battlefield
    initHexBattlefield : function(roomName){
        let dataBattlefield = [];
        for(let i = 0; i < maxPlayerInRoom ; i++){
            var newHexBattlefield = new HexBattlefield("Battlefield_"+i);
            dataBattlefield.push(newHexBattlefield);
        }
        RoomList[roomName].Battlefield = dataBattlefield;
    },

    getBattlefield: function(roomName, hexBattlefieldName){
        return RoomList[roomName].Battlefield.find((x) => { return x.hexBattlefieldName == hexBattlefieldName; });
    },
    getBattlefieldList: function(roomName){
        return RoomList[roomName].Battlefield;
    },
    setBattlefield : function(roomName, battlefieldName, player1, player2, formation1, formation2){
        let battlefield = RoomList[roomName].Battlefield.find((x) => { return x.hexBattlefieldName == battlefieldName; });
        battlefield.home = player1;
        battlefield.away = player2;
        for(const [key, value] of Object.entries(formation1 || {})){
            console.log(key + " - " + value);
        }
        for(const [key, value] of Object.entries(formation2 || {})){
            console.log(key + " - " + value);
        }
        for (const [key, value] of Object.entries(formation1 || {})) {
            const node = key.split('').reduce((acc, curr) => {
                if(!isNaN(curr))
                    acc.push(parseInt(curr)); // Convert each character back to a number
                return acc;
            }, []);
            battlefield.setUnit(node[0], node[1], value);
            battlefield.setIsWalkable(node[0], node[1], false);
        }
        for (const [key, value] of Object.entries(formation2 || {})) {
            const node = key.split('').reduce((acc, curr) => {
                if(!isNaN(curr))
                    acc.push(parseInt(curr)); // Convert each character back to a number
                return acc;
            }, []);
            let row = HexBattlefield.rowsBattlefield;
            let column = HexBattlefield.columnBattlefield;
            if(player2 == "PvE"){
                battlefield.setUnit(node[0], node[1], value);
                battlefield.setIsWalkable(node[0], node[1], false);
            }
            else{
                battlefield.setUnit(row - 1 - node[0], column - 1 - node[1], value);
                battlefield.setIsWalkable(row - 1 - node[0], column - 1 - node[1], false);
            }
        }
        console.log("setBattlefield");
        for(let i = 0; i< HexBattlefield.rowsBattlefield; i++){
            for(let j = 0; j< HexBattlefield.columnBattlefield; j++){
                if(battlefield.hexBattlefield[i][j].unit != null)
                    console.log(i+ ","+j +": " + battlefield.hexBattlefield[i][j].unit.championName+"_" +battlefield.hexBattlefield[i][j].unit._id);
            }
        }
    },
    resetBattlefield : function(roomName){
        let battlefield = RoomList[roomName].Battlefield;
        for(let i of battlefield){
            //console.log("resetBattlefield: " + i.hexBattlefieldName + " - " + i.home + " vs " + i.away);
            i.home = null;
            i.away = null;
            i.resetHexBattlefield();
        }
    },
};