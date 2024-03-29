var Matchmaking = {};
const maxPlayerInTheRoom = 2; //4
module.exports = {
    setFindingMatch: function(username, profileImage, socketid, status){
        let playerFindingMatch = {};
        playerFindingMatch["username"] = username;
        playerFindingMatch["profileImage"] = profileImage;
        playerFindingMatch["socketid"] = socketid;
        playerFindingMatch["status"] = status;

        for (var key in Matchmaking) {
            if (!Matchmaking.hasOwnProperty(key)) 
                continue;
            var room = Matchmaking[key];
            if(room.length < maxPlayerInTheRoom){
                room.push(playerFindingMatch);
                return key;
            }
        }
        let newRoom = [];
        newRoom.push(playerFindingMatch);
        Matchmaking["room-"+socketid] = newRoom;
        return "room-"+socketid;
    },

    getRoomFindingMatch: function(roomName){
        return Matchmaking[roomName];
    },

    deleteRoomFindingMatch: function(roomName){
        delete Matchmaking[roomName];
    },

    getRoomFindingMatchByUsername: function(username){
        for(var key in Matchmaking){
            var player = Matchmaking[key].find((x) => { return x.username == username });
            if(player != undefined)
                return Matchmaking[key];
        }
        return null;
    },

    deletePlayerByName: function(username){
        for (var key in Matchmaking) {
            if (!Matchmaking.hasOwnProperty(key)) 
                continue;
            if(Matchmaking[key].find((x) => x.username == username)){
                Matchmaking[key] = Matchmaking[key].filter(function(el)
                { 
                    return el.username != username; 
                });
                if(Object.keys(Matchmaking[key]).length == 0){
                    delete Matchmaking[key];
                }
                return;
            }
        }
    },

    all: function(){
        return Matchmaking;
    }
}