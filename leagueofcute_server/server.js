var express = require("express");
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);
server.listen(3000);

//leagueofcute:JhtckBPx129yHWsB
var PlayerStat = require('./models/PlayerStat.js');
var User = require('./models/Users.js');
var Inventory = require('./models/Inventory.js');
var Tacticians = require('./models/Tacticians.js');
var ArenaSkins = require('./models/ArenaSkins.js');
var Booms = require('./models/Booms.js');
var FriendList = require('./models/FriendLists.js');
var Rooms = require('./models/RoomList.js');
var Matchmaking = require('./models/Matchmaking.js');
var HexBattlefield = require('./models/HexBattlefield.js');
var StageSystem = require('./models/StageSystem.js');
var ChampionPool = require("./models/ChampionPool");
var Traits = require("./models/Traits");
var Items = require("./models/Items");
var RerollProbability = require("./models/RerollProbability");


//#region mongoose
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);
mongoose.connect('mongodb+srv://leagueofcute:JhtckBPx129yHWsB@cluster0.a89vfs5.mongodb.net/leagueofcute_00?retryWrites=true&w=majority', function(e){
    if(e){
        console.log("Mongo connection error");
    }
    else{
        console.log("Mongo connection succesfully");
    }
});
//#endregion

io.on("connection", function(socket){
    console.log("New connection: " + socket.id);
    //#region Login - Register
    socket.auth = false;
    socket.on("authenticate", async (username, password) => {
        console.log("username: " + username + " - password: " + password);
        var user = await User.findOne({ username }).exec();
        const passwordHash = require('crypto').createHash('md5').update(password).digest("hex");
        if (user === null || user.password !== passwordHash) {
            return socket.emit("authentication-error", "Invalid username or password" );
        }
        else {
            socket.auth = true;
            user.socketID = socket.id;
            user.online = true;
            user.lastLogin = new Date().toLocaleString();;
            user.save((e) => {
                if(e) console.log(e);
            })
            socket.user = user;
            //
            var tacticians = await Tacticians.find().exec();
            var arenaSkins = await ArenaSkins.find().exec();
            var booms = await Booms.find().exec();
            socket.emit("get-store", JSON.stringify(tacticians), JSON.stringify(arenaSkins), JSON.stringify(booms));
            //
            var inventory = await Inventory.findOne({ username }).exec();
            socket.inventory = inventory;
            socket.emit("get-inventory", JSON.stringify(inventory));
            //
            FriendList.findOne({username : socket.user.username}, async function(e, userFriendList){
                if(!e && userFriendList != null){
                    var listFriendAccepted = [];
                    var listFriendSendRequest = [];
                    var listFriendWaiting = [];
                    for(let friend of userFriendList.friends){
                        var userInfo = await User.findOne({ username : friend.friendName}).exec();
                        if(friend.status == -1)
                            listFriendWaiting.push(userInfo);
                        else if(friend.status == 0)
                            listFriendSendRequest.push(userInfo);
                        else
                            listFriendAccepted.push(userInfo);
                    }
                    socket.emit("get-friend-list", JSON.stringify(listFriendAccepted), JSON.stringify(listFriendSendRequest), JSON.stringify(listFriendWaiting));
                }
            }); 
            return socket.emit("authorized", "Login successful", JSON.stringify(user));
        }
    });
    
    socket.on("register", async (_username, _password, _email) => {
        const user = await User.findOne({
            $or: [
                   { username : _username },
                   { email : _email }
                 ]
            }).exec();
        if (user != null) {
            if(user.username === _username)
                return socket.emit("register-error", "Username is already taken");
            else if (user.email === _email)
                return socket.emit("register-error", "Email is already taken" );
        }
        else {
            const passwordHash = require('crypto').createHash('md5').update(_password).digest("hex");
            var newUser = new User({
                username: _username,
                password: passwordHash,
                email: _email,
            });
            newUser.save(function(e){
                if(!e)
                    console.log(newUser);
            });
            var newUserInventory = new Inventory({
                username : _username
            });
            newUserInventory.save(function(e){
                if(!e)
                    console.log(newUserInventory);
            });
            var newUserFriendList = new FriendList({
                username : _username
            });
            newUserFriendList.save(function(e){
                if(!e)
                    console.log(newUserFriendList);
            });
            return socket.emit("register-success", "Registration successful" );
        }
    });
    //#endregion

    //#region Disconnect
    socket.on("disconnect", function(){
        console.log(socket.id + " has been disconnected");
    });
    //#endregion

    //#region Tacticians, Arena Skins, Booms
    socket.on("equip-item-client", function(itemID, itemClass){
        Inventory.findOne({ username : socket.user.username }, function(e, userInventory){
            if(!e && userInventory != null){
                switch(itemClass){
                    case "Tactician":
                        userInventory.tacticianEquip = itemID;
                        break;
                    case "ArenaSkin":
                        userInventory.arenaSkinEquip = itemID;
                        break;
                    case "Boom":
                        userInventory.boomEquip = itemID;
                        break;
                }
                userInventory.save((eSave) => {
                    if(eSave){
                        console.log(e);
                    }
                });
            }
        });
    });

    socket.on("buy-item", async function(itemId, itemClass){
        var item = {};
        var itemArray;
        switch(itemClass){
            case "Tactician":
                item = await Tacticians.findOne({itemID : itemId}).exec(); 
                itemArray = "tacticians";
                break;
            case "ArenaSkin":
                item = await ArenaSkins.findOne({itemID : itemId}).exec();
                itemArray = "arenaSkins";
                break;
            case "Boom":
                item = await Booms.findOne({itemID : itemId}).exec();
                itemArray = "booms";
                break;    
        }
        Inventory.findOne({ username : socket.user.username }, function(e, userInventory){
            if(!e && userInventory != null){
                if(userInventory[item.price.currency] >= item.price.amount){
                    userInventory[item.price.currency] -= item.price.amount;
                    userInventory[itemArray].push(itemId);
                    userInventory.save((eSave) => {
                        if(!eSave){
                            socket.emit("buy-item-success", "Buy item successful" );
                        }
                    });
                    socket.emit("get-inventory", JSON.stringify(userInventory));
                }
                else{
                    socket.emit("buy-item-error", "Buy item fail" );
                }
            }
        });
    });
    //#endregion

    //#region Ranked
    socket.on("get-my-ranking", async function(){
        let myRanking = await getMyRanking(socket.user.username);
        socket.emit("get-my-ranking-success", JSON.stringify(myRanking));
    });
    socket.on("get-ranked", async function(_rank){
        let rankedData = await getRanked(_rank);
        socket.emit("get-ranked-success", JSON.stringify(rankedData));
    });
    //#endregion

    //#region Friend
    socket.on("send-friend-request", async function(usernameFriend){
        if(usernameFriend == socket.user.username)
            return socket.emit("send-friend-request-error", "Không thể kết bạn với bản thân");
        var friend = await User.findOne({username : usernameFriend}).exec();
        if(friend != null){
            FriendList.findOne({username : socket.user.username}, async function(e, userFriendList){
                if(!e && userFriendList != null){
                    if((userFriendList.friends || []).filter(function(x){ return x.friendName == usernameFriend; }).length > 0)
                        return socket.emit("send-friend-request-error", "Đang chờ người chơi chấp nhận lời mời");
                    else{
                        var newFriendRequest = {};
                        newFriendRequest.friendName = usernameFriend;
                        newFriendRequest.status = 0;
                        userFriendList.friends.push(newFriendRequest);
                        userFriendList.save((eSave) => {
                            if(eSave){
                                console.log(eSave);
                            }
                        });
                        socket.emit("send-friend-request-success", JSON.stringify(friend));
                        FriendList.findOne({username : usernameFriend}, async function(e, friendListofUsernameFriend){
                            if(!e && friendListofUsernameFriend != null){
                                var newRequestWaitingResponse = {};
                                newRequestWaitingResponse.friendName = socket.user.username;
                                newRequestWaitingResponse.status = -1;
                                friendListofUsernameFriend.friends.push(newRequestWaitingResponse);
                                friendListofUsernameFriend.save((eSave) => {
                                    if(!eSave)
                                        console.log(eSave);
                                });
                                if(friend.online == true && friend.socketID != '')
                                    io.to(`${friend.socketID}`).emit("new-request-waiting-response", JSON.stringify(socket.user));
                            }
                        });
                    }
                }
            });
        }
        else{
            socket.emit("send-friend-request-error", "Người chơi không tồn tại");
        }
    });
    //Hủy lời mời kết bạn của bản thân gửi cho đối phương
    socket.on("cancel-friend-request", function(usernameFriend){
        try{
            FriendList.findOne({username : socket.user.username}, function(e, userFriendList){
                if(!e && userFriendList != null){
                    userFriendList.friends = userFriendList.friends.filter(function(x){ return x.friendName != usernameFriend; })
                    userFriendList.save((e) => {
                        if(!e)
                            socket.emit("cancel-friend-request-success", usernameFriend);
                    });
                    FriendList.findOne({username : usernameFriend}, function(e, friendListofUsernameFriend){
                        if(!e && friendListofUsernameFriend != null){
                            friendListofUsernameFriend.friends = friendListofUsernameFriend.friends.filter(function(x){ return x.friendName != socket.user.username; })
                            friendListofUsernameFriend.save((e) => {
                                if(!e){
                                    User.findOne({username: usernameFriend}, function(e, friend){
                                        if(!e && friend != null){
                                            if(friend.online == true && friend.socketID != '')
                                            io.to(`${friend.socketID}`).emit("cancel-request-waiting-response", socket.user.username);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
                else
                    socket.emit("cancel-friend-request-error", "Có lỗi khi hủy lời mời kết bạn, hãy thử lại");
            });
        }
        catch{
            console.log("cancel-friend-request-error");
        }
    });
    //Chấp nhận lời mời kết bạn của đối phương gửi cho bản thân
    socket.on("accept-request-waiting-response", function(userInfo){
        try{
            FriendList.findOne({username : socket.user.username}, function(e, userFriendList){
                if(!e && userFriendList != null){
                    const index = userFriendList.friends.findIndex(object => { return object.friendName == userInfo.username; });
                    if (index !== -1) {
                        userFriendList.friends[index].status = 1;
                    }
                    userFriendList.save((e) => {
                        if(!e){
                            socket.emit("accept-request-waiting-response-success", JSON.stringify(userInfo));
                        }
                    });
                    FriendList.findOne({username : userInfo.username}, function(e, friendListofUsernameFriend){
                        if(!e && friendListofUsernameFriend != null){
                            const index = friendListofUsernameFriend.friends.findIndex(object => { return object.friendName == socket.user.username; });
                            if (index !== -1) {
                                friendListofUsernameFriend.friends[index].status = 1;
                            }
                            friendListofUsernameFriend.save((e) => {
                                if(!e){
                                    User.findOne({username: userInfo.username}, function(e, friend){
                                        if(!e && friend != null){
                                            if(friend.online == true && friend.socketID != '')
                                                io.to(`${friend.socketID}`).emit("accept-friend-request-success", JSON.stringify(socket.user));
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
                else
                    socket.emit("accept-friend-request-error", "Có lỗi khi chấp nhận lời mời kết bạn, hãy thử lại");
            });
        }
        catch{
            console.log("cancel-friend-request-error");
        }
    });
    //Từ chối lời mời kết bạn của đối phương gửi cho bản thân 
    socket.on("decline-request-waiting-response", function(usernameFriend){
        try{
            FriendList.findOne({username : socket.user.username}, function(e, userFriendList){
                if(!e && userFriendList != null){
                    userFriendList.friends = userFriendList.friends.filter(function(x){ return x.friendName != usernameFriend; })
                    userFriendList.save((e) => {
                        if(!e)
                            socket.emit("decline-request-waiting-response-success", usernameFriend);
                    });
                    FriendList.findOne({username : usernameFriend}, function(e, friendListofUsernameFriend){
                        if(!e && friendListofUsernameFriend != null){
                            friendListofUsernameFriend.friends = friendListofUsernameFriend.friends.filter(function(x){ return x.friendName != socket.user.username; })
                            friendListofUsernameFriend.save((e) => {
                                if(!e){
                                    User.findOne({username: usernameFriend}, function(e, friend){
                                        if(!e && friend != null){
                                            if(friend.online == true && friend.socketID != '')
                                            io.to(`${friend.socketID}`).emit("cancel-friend-request-success", socket.user.username);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
                else
                    socket.emit("cancel-friend-request-error", "Có lỗi khi hủy lời mời kết bạn, hãy thử lại");
            });
        }
        catch{
            console.log("cancel-friend-request-error");
        }
    });
    //#endregion
    
    //player-stat
    socket.on("player-stat", function(){
        var player = Rooms.getPlayer(socket.roomName, socket.user.username);
        socket.emit("player-stat", JSON.stringify(player));
    });

    //#region Matchmaking
    socket.on("start-matchmaking", async function(){
        await startMatchmaking(socket.user.username, socket.user.profileImage, socket.id);
    });

    socket.on("stop-matchmaking", function(){
        stopMatchmaking(socket.user.username);
    });

    socket.on("match-found", function(){ 
        //io.to(`${socketId}`).emit('match-found', 'I just met you');
    });

    socket.on("accept-match-found", function(isAccept){ 
        acceptMatchFound(isAccept, socket.user.username);
    });

    socket.on("join-room", async function(roomName){
        await joinRoom(socket, roomName);
        //console.log(io.sockets.adapter.rooms);
    });

    socket.on("loading-complete", function(isloadingComplete){
        loadingComplete(socket.roomName, socket.user.username, isloadingComplete);
        //console.log(io.sockets.adapter.rooms);
    });
    //#endregion

    //get-player-stat
    socket.on("get-player-data", function(){
        if(socket.roomName != null &&  socket.user.username != null){
            const player = Rooms.getPlayer(socket.roomName, socket.user.username);
            socket.emit("get-player-data-success", JSON.stringify(player));
        }
    });

    //update-scoreboard
    socket.on("update-scoreboard", function(){
        try{
            updateScoreboard(socket.roomName);
        }
        catch{
            console.log("update-scoreboard error");
        }
    });

    //#region UnitShop
    socket.on("lock-unit-shop", function(){
        var player = Rooms.getPlayer(socket.roomName, socket.user.username);
        const islock = lockUnitShop(player);
        socket.emit("lock-unit-shop-success", islock);
    });

    socket.on("refresh-unit-shop", async function(){
        try{
            var player = Rooms.getPlayer(socket.roomName, socket.user.username);
            if(player.lockedUnitShop == false && player.gold >= player.goldRefreshUnitShop){
                player.gold = player.gold - player.goldRefreshUnitShop;
                const newUnits = await refreshUnitShop(player);
                socket.emit("refresh-unit-shop-success", JSON.stringify(newUnits));
                socket.emit("update-gold", player.gold);
            }
            else{
                socket.emit("refresh-unit-shop-fail", "Làm mới thất bại");
            }
        }
        catch{
            socket.emit("refresh-unit-shop-fail", "Làm mới thất bại");
        }
    });

    socket.on("buy-unit", function(_slotUnitShop){
        let player = Rooms.getPlayer(socket.roomName, socket.user.username);
        buyUnit(socket.id, player, _slotUnitShop);
    });

    socket.on("sell-unit", function(_unit){
        var player = Rooms.getPlayer(socket.roomName, socket.user.username);
        sellUnit(socket.id, player, _unit);
    });
    //#endregion

    //#region DragDropUnit
    socket.on("drag-drop-unit", function(_unit, _selectedNode, _selectedNodeTag){
        var player = Rooms.getPlayer(socket.roomName, socket.user.username);
        dragdrop(socket.id, player, _unit, _selectedNode, _selectedNodeTag);
    });
    //#endregion

    //#region UnitMovement
    socket.on("get-nearest-enemy", function(_unit, _battlefieldName){
        var nearestEnemy = getNearestEnemy(socket.roomName, _unit, _battlefieldName);
        if(nearestEnemy != null){
            socket.emit("get-nearest-enemy-success", JSON.stringify(_unit), JSON.stringify(nearestEnemy));
        }
        else{
            socket.emit("get-nearest-enemy-fail", JSON.stringify(_unit));
        }
    });

    socket.on("unit-movement", function(unit, battlefieldName, target, unitHP, targetHP, isOpponent, isTargetMoving){
        let newHexNode = unitMovement(socket.roomName, unit, battlefieldName, target, unitHP, targetHP, isOpponent, isTargetMoving);
        //console.log("unit-movement: " + unit.championName + "_" +unit._id + " : " + newHexNode);
        if(newHexNode != null){
            socket.emit("unit-movement-success", JSON.stringify(unit), newHexNode);
        }
        else{
            socket.emit("unit-movement-fail", JSON.stringify(unit));
        }
    });
    //#endregion

    //#region Traits
    socket.on("get-traits", async function(){
        var traits = await getTraits();
        socket.emit("get-traits-success", JSON.stringify(traits));
    });
    //#endregion

    //#region ItemManager
    socket.on("combine-item", async function(unit, item1, item2){
        var item = await combineItem(item1, item2);
        socket.emit("combine-item-success",JSON.stringify(unit), JSON.stringify(item1), JSON.stringify(item));
    });
    //#endregion

    //#region UnitMovement
    socket.on("remove-unit-from-battlefield", function(_unit, _battlefieldName){
        removeUnitFromBattlefield(socket.roomName, _unit, _battlefieldName);
    });
    //#endregion
    socket.on("leave-room", function(_roomName){
        socket.leave(_roomName);
        socket.roomName = null
        if(!io.sockets.adapter.rooms.get(_roomName)){
            Rooms.deleteRoom(_roomName);
            console.log("io.sockets.adapter.rooms.get(_roomName).size == 0");
        }
        console.log("leave-room " + _roomName);
    });
})

//
async function getMyRanking(_username){
    var myRanking = await User.findOne({username : _username}, {_id: 0, rank: 1, points: 1});
    return myRanking;
}
async function getRanked(_rank){
    var rankedData = await User.find({rank : _rank}, {_id: 0, username: 1, profileImage: 1, rank: 1, points: 1}).sort({points: -1});
    return rankedData;
}

//
async function startMatchmaking(username, profileImage, socketid){
    const roomName = Matchmaking.setFindingMatch(username, profileImage, socketid, 0);
    if(Matchmaking.getRoomFindingMatch(roomName).length == 2){ // == 2
        let arrSocketid = Matchmaking.getRoomFindingMatch(roomName).map(x => x.socketid);
        arrSocketid.forEach((socketid) => {
            io.to(`${socketid}`).emit('match-found');
        });
        await matchFound(roomName, arrSocketid);
    }
    console.log(username + " start matchmaking");
    console.log(Matchmaking.all());
}

//
function stopMatchmaking(username){
    Matchmaking.deletePlayerByName(username);
    console.log(username + " stop matchmaking");
    console.log(Matchmaking.all());
}

//
async function matchFound(roomName, arrSocketid){
    setTimeout(async function(){
        if(Matchmaking.getRoomFindingMatch(roomName).length > 0){
            const playerReady = Matchmaking.getRoomFindingMatch(roomName).filter(x => x.status == 1);
            if(playerReady.length == 2){ // == 2
                await instanceRoom(roomName);
                Matchmaking.deleteRoomFindingMatch(roomName);
                arrSocketid.forEach((socketid) => {
                    io.to(`${socketid}`).emit("accept-match-found-success", roomName);
                });
            }
            else{
                for(var kv in playerReady)
                    playerReady[kv].status = 0;
            }
        }
        // console.log("Matchmaking.all()");
        // console.log(Matchmaking.all());
    }, 10000);
}

//
function acceptMatchFound(isAccept, username){
    if(isAccept == true){
        console.log(username + " acceptMatchFound");
        try{
            var player = Matchmaking.getRoomFindingMatchByUsername(username).find((x) => { return x.username == username; });
            if(player != undefined)
                player.status = 1;
        }
        catch{
            console.log("accept-match-found error");
        }
    }
}

//
async function joinRoom(socket, roomName){
    let clientsInRoom = 0;
    if (io.sockets.adapter.rooms.has(roomName)){
        clientsInRoom = io.sockets.adapter.rooms.get(roomName).size;
    }
    if(clientsInRoom < 2){
        socket.join(roomName);
        var allPlayerData = [];
        for(var player of Rooms.getPlayerList(roomName)){
            let data = {};
            var userData = await User.findOne({username : player.username}).exec();
            if(userData != null){
                data.username = userData.username;
                data.profileImage = userData.profileImage;
                data.rank = userData.rank;
                data.points = userData.points;
            }
            var inventoryData = await Inventory.findOne({username : player.username}).exec();
            if(inventoryData != null){
                data.tacticianEquip = inventoryData.tacticianEquip;
            }
            allPlayerData.push(data);
        }
        socket.roomName = roomName;
        socket.emit("join-room-success", roomName, JSON.stringify(allPlayerData));
    }
    else{
        socket.emit("join-room-fail",  "Lỗi khi tham gia phòng");
    }
}

//
function loadingComplete(roomName, username, isloadingComplete){
    var player = Rooms.getPlayer(roomName, username);
    player.loadingComplete = isloadingComplete;
    for(var i of Rooms.getPlayerList(roomName)){
        if(i.loadingComplete == false)
            return;
    }
    io.in(roomName).emit("loading-complete-success");
    updateScoreboard(roomName);
    StageSystem.instantiateNewStage(roomName);
    StageSystem.startBattle(roomName);
    console.log(StageSystem.getAll());
}

//
function getInstancePlayerStat(room, username){
    var player = Rooms.getPlayer(room, username);
    return player;
}

//
function updateScoreboard(room){
    const scoreboard = Rooms.getPlayerListWithHpSort(room);
    io.in(room).emit("update-scoreboard", JSON.stringify(scoreboard));
}

//#region UnitShop
//add-gold
function addGold(_player, _gold){
    return _player.gold += _gold;
}

//subtract-gold
function subtractGold(_player, _gold){
    return _player.gold -= _gold;
}

//remove-unit-on-unit-shop
function removeUnitOnUnitShop(_player, _slot){
    _player.removeUnitOnUnitShop(_slot);
}

//refresh-unit-shop
async function refreshUnitShop(_player){
    let unitShop = {};  
    for (let i = 0; i < 5 ; i ++) {
        //lấy ngẫu nhiên unit với tỉ lệ roll hiện tại của player
        var unit = await getRandomUnit(_player.rerollProbability);
        //unit.currentLevel = unit.level[0]; 
        unitShop["slot"+i] = unit;
    }
    //thêm unit vào shop 
    _player.unitShop = unitShop;
    return unitShop;
}

async function getChampionByTier(_tier){
    try {
        let champion = await ChampionPool.aggregate([{ $match: { tier: _tier } }, { $sample: { size: 1 } }]);
        // let champion1 = await ChampionPool.find({tier: _tier}).lean();
        // const randomChampion = champion1.sort(() => Math.random() - 0.5);
        // console.log("randomChampion");
        // console.log("getChampionByTier: " + champion[0]);
        return champion[0];
    } catch (error) {
        console.error(error)
    }
}
async function getChampionByName(_championName){
    try {
        let champion = await ChampionPool.findOne({championName: _championName}).lean();
        //console.log(champion);
        return champion;
    } catch (error) {
        console.error(error)
    }
}
async function getRerollProbabilityByLevel(_level){
    try {
        let rerollProbability = await RerollProbability.findOne({level: _level}).lean();
        //console.log(rerollProbability);
        return rerollProbability;
    } catch (error) {
        console.error(error)
    }
}
async function getRandomUnit(_rerollProbability){
    try{
        const randomValue = Math.floor(Math.random() * 101);
        let runningSum = 0;
        let tier;
        for (let i = 1; i < 6 ; i ++) {
            runningSum += _rerollProbability["tier"+i];
            if (randomValue <= runningSum) {
                tier = i;
                break;
            }
        }
        let randomChampion = await getChampionByTier(tier);
        //console.log(randomChampion);
        return randomChampion;
    } catch (error) {
        console.error(error)
    }
}

//buy-unit
function buyUnit(_socketid, _player, _slotUnitShop){
    let unit = _player.unitShop[_slotUnitShop];
    if(unit == null || unit == "undefined ")
        return io.to(_socketid).emit("buy-unit-fail", "Mua thất bại");
    if(_player.gold < unit.buyPrice)
        return io.to(_socketid).emit("buy-unit-fail", "Không đủ vàng");
    else{
        removeUnitOnUnitShop(_player, _slotUnitShop);
        subtractGold(_player, unit.buyPrice);
        io.to(_socketid).emit("update-gold", _player.gold);
        //Note: Ưu tiên nâng cấp unit trên "Sân đấu" > "Hàng chờ"
        let result = {};
        //số lượng unit 1* giống với unit cần mua có trên "Hàng chờ" và "Sân đấu"
        const unitsOneStarOnBench = getNumberOfUnits(_player.bench, unit, 1);
        const unitsOneStarOnBattlefield = getNumberOfUnits(_player.battlefield, unit, 1);
        //PlanningPhase => tăng sao lập tức khi unit ở trên "Hàng chờ" hoặc "Sân đấu"
        if(_player.phase == "PlanningPhase"){
            //nếu số lượng unit 1* đang có là 0 hoặc 1
            if(unitsOneStarOnBench.length + unitsOneStarOnBattlefield.length < 2){
                //nếu "Hàng chờ" vẫn còn slot trống => thêm mới unit 1* vào "Hàng chờ"
                if(Object.keys(_player.bench || {}).length < _player.maxUnitInBench){
                    unit._id = Math.random().toString(36).substring(2);
                    unit.currentLevel = unit.level[0]; 
                    unit.owner = _player.username;                   
                    const newUnit = _player.addUnitOnBench(unit);
                    return io.to(_socketid).emit("buy-unit-success", _slotUnitShop, JSON.stringify(newUnit));
                }
            }
            //nếu số lượng unit 1* đang có là 2 => có thể nâng cấp unit lên 2*
            else{
                //số lượng unit 2* giống với unit cần mua có trên "Hàng chờ" và "Sân đấu"
                const unitsTwoStarOnBench = getNumberOfUnits(_player.bench, unit, 2);
                const unitsTwoStarOnBattlefield = getNumberOfUnits(_player.battlefield, unit, 2);
                //nếu số lượng unit 2* đang có là 0 hoặc 1 => chỉ nâng cấp unit 1* => 2*
                if(unitsTwoStarOnBench.length + unitsTwoStarOnBattlefield.length < 2){
                    console.log("unitsTwoStarOnBench.length + unitsTwoStarOnBattlefield.length < 2");
                    //nếu có unit 1* trên "Sân đấu" => ưu tiên nâng cấp
                    if(unitsOneStarOnBattlefield.length > 0){
                        console.log("unitsOneStarOnBattlefield.length > 0");
                        const index = Object.keys(_player.battlefield || {}).find(key => _player.battlefield[key] == unitsOneStarOnBattlefield[0]);
                        unitsOneStarOnBattlefield[0].currentLevel = unit.level[1];
                        result.slot = index;
                        result.unit = unitsOneStarOnBattlefield[0];
                        result.position = "Battlefield";
                    }
                    //nếu không có unit 1* trên "Sân đấu" => nâng cấp unit trên "Hàng chờ"
                    else{
                        console.log("unitsOneStarOnBattlefield.length == 0");
                        const index = Object.keys(_player.bench || {}).find(key => _player.bench[key] == unitsOneStarOnBench[0]);
                        unitsOneStarOnBench[0].currentLevel = unit.level[1];
                        result.slot = index;
                        result.unit = unitsOneStarOnBench[0];
                        result.position = "Bench";
                    }
                }
                //nếu số lượng unit 2* đang có là 2 => có thể nâng cấp unit 2* => 3*
                else{
                    //nếu có unit 2* trên "Sân đấu" => ưu tiên nâng cấp
                    if(unitsTwoStarOnBattlefield.length > 0){
                        const index = Object.keys(_player.battlefield || {}).find(key => _player.battlefield[key] == unitsTwoStarOnBattlefield[0]);
                        unitsTwoStarOnBattlefield[0].currentLevel = unit.level[2];
                        result.slot = index;
                        result.unit = unitsTwoStarOnBattlefield[0];
                        result.position = "Battlefield";
                    }
                    //nếu không có unit 2* trên "Sân đấu" => nâng cấp unit trên "Hàng chờ"
                    else{
                        const index = Object.keys(_player.bench || {}).find(key => _player.bench[key] == unitsTwoStarOnBench[0]);
                        unitsTwoStarOnBench[0].currentLevel = unit.level[2];
                        result.slot = index;
                        result.unit = unitsTwoStarOnBench[0];
                        result.position = "Bench";
                    }
                    //nâng cấp unit 3* => xóa bỏ các unit 2*
                    for(let i of unitsTwoStarOnBench){
                        if(i._id != result.unit._id)
                            io.to(_socketid).emit("remove-unit-on-bench", _player.removeUnitOnBench(i), JSON.stringify(i));
                    }
                    for(let i of unitsTwoStarOnBattlefield){
                        if(i._id != result.unit._id)                            
                            io.to(_socketid).emit("remove-unit-on-battlefield", _player.removeUnitOnBattlefield(i), JSON.stringify(i));
                    }
                }
                //nâng cấp unit 2* => xóa bỏ các unit 1*
                for(let i of unitsOneStarOnBench){
                    if(i._id != result.unit._id){
                        io.to(_socketid).emit("remove-unit-on-bench", _player.removeUnitOnBench(i), JSON.stringify(i));
                    }
                }
                for(let i of unitsOneStarOnBattlefield){
                    if(i._id != result.unit._id){
                        io.to(_socketid).emit("remove-unit-on-battlefield", _player.removeUnitOnBattlefield(i), JSON.stringify(i));
                    }
                }
                //trả kết quả để nâng cấp unit
                return io.to(_socketid).emit("upgrade-unit-success", _slotUnitShop, result.position, result.slot, JSON.stringify(result.unit));
                // if(result.position == "Bench")
                //     return io.to(_socketid).emit("upgrade-unit-on-bench-success", _slotUnitShop, JSON.stringify(result));
                // else
                //     return io.to(_socketid).emit("upgrade-unit-on-battlefield-success", _slotUnitShop, JSON.stringify(result));
            }
        }
        //CombatPhase => tăng sao lập tức khi unit ở trên "Hàng chờ", khi unit trên "Sân đấu" thì phải chờ kết thúc trận đấu (chờ PlanningPhase)
        else if(_player.phase == "CombatPhase" || _player.phase == "ArrivalPhase"){
            //nếu số lượng unit 1* đang có trên "Hàng chờ" 0 hoặc 1
            if(unitsOneStarOnBench.length < 2){
                //nếu "Hàng chờ" vẫn còn slot trống => thêm mới unit 1* vào "Hàng chờ"
                if(Object.keys(_player.bench || {}).length < _player.maxUnitInBench){
                    unit._id = Math.random().toString(36).substring(2);
                    unit.currentLevel = unit.level[0]; 
                    unit.owner = _player.username;    
                    const newUnit = _player.addUnitOnBench(unit);
                    return io.to(_socketid).emit("buy-unit-success", _slotUnitShop, JSON.stringify(newUnit));
                }
            }
            //nếu số lượng unit 1* đang có là 2 => có thể nâng cấp unit lên 2*
            else{
                //số lượng unit 2* giống với unit cần mua có trên "Hàng chờ"
                const unitsTwoStarOnBench = getNumberOfUnits(_player.bench, unit, 2);

                //nếu số lượng unit 2* đang có là 0 hoặc 1 => chỉ nâng cấp unit 1* => 2*
                if(unitsTwoStarOnBench.length < 2){
                    const index = Object.keys(_player.bench || {}).find(key => _player.bench[key] == unitsOneStarOnBench[0]);
                    unitsOneStarOnBench[0].currentLevel = unit.level[1];
                    result.slot = index;
                    result.unit = unitsOneStarOnBench[0];
                    result.position = "Bench";
                }
                //nếu số lượng unit 2* đang có là 2 => có thể nâng cấp unit 2* => 3*
                else{
                    const index = Object.keys(_player.bench || {}).find(key => _player.bench[key] == unitsTwoStarOnBench[0]);
                    unitsTwoStarOnBench[0].currentLevel = unit.level[2];
                    result.slot = index;
                    result.unit = unitsTwoStarOnBench[0];
                    result.position = "Bench";
                    for(let i of unitsTwoStarOnBench){
                        if(i._id != result.unit._id)
                            io.to(_socketid).emit("remove-unit-on-bench", _player.removeUnitOnBench(i), JSON.stringify(i));
                    }
                }
                for(let i of unitsOneStarOnBench){
                    if(i._id != result.unit._id)
                        io.to(_socketid).emit("remove-unit-on-bench", _player.removeUnitOnBench(i), JSON.stringify(i));
                }
                return io.to(_socketid).emit("upgrade-unit-success", _slotUnitShop, result.position, result.slot, JSON.stringify(result.unit));
            }
        }
        return io.to(_socketid).emit("buy-unit-fail", "Mua thất bại");
    }
}

function lockUnitShop(_player){
    _player.lockedUnitShop = !_player.lockedUnitShop;
    return _player.lockedUnitShop;
}

function sellUnit(_socketid, _player, _unit){
    let checkUnitOnBench =  Object.values(_player.bench || {}).filter(function(value) {
        return value._id == _unit._id && value.championName == _unit.championName;
    }); 
    if(checkUnitOnBench.length > 0){
        io.to(_socketid).emit("remove-unit-on-bench", _player.removeUnitOnBench(_unit), JSON.stringify(_unit));
    }
    else{
        io.to(_socketid).emit("remove-unit-on-battlefield", _player.removeUnitOnBattlefield(_unit), JSON.stringify(_unit));
    }
    addGold(_player, _unit.currentLevel.sellPrice);    
    io.to(_socketid).emit("update-gold", _player.gold);
}

function getNumberOfUnits(_object, _unit, _star){
    return Object.values(_object || {}).filter(function(value) {
        return value.championName == _unit.championName && value.currentLevel.star == _star;
    }); 
}
//#endregion

//#region DragDrop
function dragdrop(_socketid, _player, _unit, _selectedNode, _selectedNodeTag){
    console.log("_selectedNode: " + _selectedNode);
    console.log("_selectedNode: " + _selectedNodeTag);
    //unit.positionOnArena = "Bench"; 
    let checkUnitOnBench =  Object.values(_player.bench || {}).filter(function(value) {
        return value._id == _unit._id && value.championName == _unit.championName;
    }); 
    let previousNode;
    let previousNodeTag;
    //unit đang trong "Hàng chờ"
    if(checkUnitOnBench.length > 0){
        previousNodeTag = "Bench";
        //kéo thả từ vị trí "Hàng chờ" -> "Hàng chờ"
        if(_selectedNodeTag == "Bench"){
            //nếu vị trí trống
            if(!(_player.bench || {}).hasOwnProperty(_selectedNode)){    
                previousNode = _player.removeUnitOnBench(_unit);
                _player.bench[_selectedNode] = _unit;
                console.log("Hàng chờ -> Hàng chờ => null")
            }
            //nếu vị trí có unit khác => đổi vị trí cho nhau
            else{
                previousNode = _player.removeUnitOnBench(_unit);
                _player.bench[previousNode] = _player.bench[_selectedNode];
                _player.bench[_selectedNode] = _unit;
                console.log("Hàng chờ -> Hàng chờ => not null")
            }
        }
        //kéo thả từ vị trí "Hàng chờ" -> "Sân đấu"
        else{
            //nếu khác CombatPhase thì có thể drop được
            if(_player.phase != "CombatPhase" ){
                //nếu slot trống
                if(!(_player.battlefield || {}).hasOwnProperty(_selectedNode)){
                    //kiểm tra xem giới hạn unit ra trận hay chưa
                    if(Object.keys(_player.battlefield || {}).length < _player.maxUnitInBattlefield){
                        previousNode = _player.removeUnitOnBench(_unit);
                        if(_player.battlefield == null)
                            _player.battlefield = {};
                        _player.battlefield[_selectedNode] = _unit;
                        console.log("Hàng chờ -> Sân đấu => null")
                    }
                }
                //nếu slot có unit khác => đổi vị trí cho nhau
                else{
                    //kiểm tra xem giới hạn unit ra trận hay chưa
                    if(Object.keys(_player.battlefield).length <= _player.maxUnitInBattlefield){
                        previousNode = _player.removeUnitOnBench(_unit);
                        _player.bench[previousNode] = _player.battlefield[_selectedNode];
                        _player.battlefield[_selectedNode] = _unit;
                        console.log("Hàng chờ -> Sân đấu => not null")
                    }
                }
            }
        }
    }
    //unit đang trong "Sân đấu"
    else{
        previousNodeTag = "Battlefield";
        //nếu khác CombatPhase thì có thể drag drop được
        if(_player.phase != "CombatPhase" ){
            //kéo thả từ vị trí "Sân đấu" -> "Hàng chờ"
            if(_selectedNodeTag == "Bench"){
                //nếu vị trí trống
                if(!(_player.bench || {}).hasOwnProperty(_selectedNode)){
                    previousNode = _player.removeUnitOnBattlefield(_unit);
                    if(_player.bench == null)
                        _player.bench = {};
                    _player.bench[_selectedNode] = _unit;
                    console.log("Sân đấu -> Hàng chờ => null")
                }
                //nếu vị trí có unit khác => đổi vị trí cho nhau
                else{
                    previousNode = _player.removeUnitOnBattlefield(_unit);
                    _player.battlefield[previousNode] = _player.bench[_selectedNode];
                    _player.bench[_selectedNode] = _unit;
                    console.log("Sân đấu -> Hàng chờ => not null")
                }
            }
            //kéo thả từ vị trí "Sân đấu" -> "Sân đấu"
            else{
                //nếu vị trí trống
                if(!(_player.battlefield || {}).hasOwnProperty(_selectedNode)){
                    previousNode = _player.removeUnitOnBattlefield(_unit);
                    _player.battlefield[_selectedNode] = _unit;
                    console.log("Sân đấu -> Sân đấu => null")
                }
                //nếu slot có unit khác => đổi vị trí cho nhau
                else{
                    previousNode = _player.removeUnitOnBattlefield(_unit);
                    _player.battlefield[previousNode] = _player.battlefield[_selectedNode];
                    _player.battlefield[_selectedNode] = _unit;
                    console.log("Sân đấu -> Sân đấu => not null")
                }
            }
        }
    }
    io.to(_socketid).emit("drag-drop-unit-success", JSON.stringify(_unit), previousNode, previousNodeTag, _selectedNode, _selectedNodeTag);
}
//#endregion

//#region UnitMovement
//tìm kẻ địch gần unit nhất
function getNearestEnemy(_roomName, unit, _battlefieldName){
    let battlefield = Rooms.getBattlefield(_roomName, _battlefieldName);
    //console.log("getNearestEnemy: " + unit.championName +"_"+unit._id);
    let hexNode = battlefield.getHexNode(unit);
    if(hexNode == null){
        return null;
    }
    else{
        let x1 = hexNode.x;
        let y1 = hexNode.y;
        let distanceUnitNearest = -1;
        let unitNearest;
        for(let i = 0; i < HexBattlefield.rowsBattlefield; i++){
            for(let j = 0; j < HexBattlefield.columnBattlefield; j++){
                //tìm unit kẻ thù
                if(battlefield.hexBattlefield[i][j].unit != null && battlefield.hexBattlefield[i][j].unit.owner != unit.owner){
                    let x2 = i;
                    let y2 = j;
                    let dx = x2 - x1;
                    let dy = y2 - y1;
                    let x = Math.abs(dx);
                    let y = Math.abs(dy);
                    // special case if we start on an odd row or if we move into negative x direction 
                    if ((dy < 0) ^ ((x1 & 1) == 1))
                        y = Math.max(0, y - (x / 2));
                    else
                        y = Math.max(0, y - (x + 1) / 2);
                    var distance = x + y;
                    //console.log(battlefield.hexBattlefield[i][j].unit.championName +"_"+battlefield.hexBattlefield[i][j].unit._id +": " + i +"," +j);
                    //console.log(distance);
                    //nếu tìm được unit có khoảng cách gần hơn
                    if(distanceUnitNearest == -1 || distance < distanceUnitNearest){
                        distanceUnitNearest = distance;
                        unitNearest = battlefield.hexBattlefield[i][j].unit;
                    }
                }
            }
        }
        if(distanceUnitNearest != -1)
            return unitNearest;
        return null;
    }
}
//di chuyển đến ô đầu tiên trong đường đi ngắn nhất được tìm thấy
function unitMovement(roomName, unit, battlefieldName, target, unitHP, targetHP, isOpponent, isTargetMoving){
    let battlefield = Rooms.getBattlefield(roomName, battlefieldName);
    let startNode = battlefield.getHexNode(unit);
    let targetNode = battlefield.getHexNode(target);
    //console.log("startNode: " + startNode.x+","+startNode.y + " - " + startNode.unit.championName+"_"+startNode.unit._id);
    //console.log("targetNode: " + targetNode.x+","+targetNode.y + " - " + targetNode.unit.championName+"_"+targetNode.unit._id);
    //nếu mục tiêu không trong phạm vi tấn công
    if(battlefield.getDistanceBetweenTwoNodes(startNode, targetNode) > unit.attackRange){
        if(unit.attackRange == 1 && target.attackRange == 1 && battlefield.getDistanceBetweenTwoNodes(startNode, targetNode) == 2 && !isTargetMoving){
            if(isOpponent){
                //console.log("unit.attackRange == 1 && target.attackRange == 1 ");
                if(unitHP < targetHP){
                    return null;
                }
                else if(unitHP > targetHP){
                    //tìm đường đi ngắn nhất tới mục tiêu
                    let path = battlefield.findShortestPath(startNode, targetNode);
                    //console.log(path);
                    //reset thông tin node cũ của unit
                    battlefield.setUnit(startNode.x, startNode.y, null);
                    battlefield.setIsWalkable(startNode.x, startNode.y, true);
                    //di chuyển unit sang node mới
                    battlefield.setUnit(path[0].x, path[0].y, unit);
                    battlefield.setIsWalkable(path[0].x, path[0].y, false);
                    //nếu là Đội khách thì đảo path vì đã xoay sân đấu ở arrivalPhase
                    if(unit.owner == battlefield.away && battlefield.away != "PvE")
                        path.reverse();
                    return [path[0].x, path[0].y];
                }
                else{
                    if(unit._id.localeCompare(target._id) == -1){
                        return null;
                    }
                    else if(unit._id.localeCompare(target._id) == 1){
                        //tìm đường đi ngắn nhất tới mục tiêu
                        let path = battlefield.findShortestPath(startNode, targetNode);
                        //console.log(path);
                        //reset thông tin node cũ của unit
                        battlefield.setUnit(startNode.x, startNode.y, null);
                        battlefield.setIsWalkable(startNode.x, startNode.y, true);
                        //di chuyển unit sang node mới
                        battlefield.setUnit(path[0].x, path[0].y, unit);
                        battlefield.setIsWalkable(path[0].x, path[0].y, false);
                        //nếu là Đội khách thì đảo path vì đã xoay sân đấu ở arrivalPhase
                        if(unit.owner == battlefield.away && battlefield.away != "PvE")
                            path.reverse();
                        return [path[0].x, path[0].y];
                    }
                }
            }
            else{
                //tìm đường đi ngắn nhất tới mục tiêu
                let path = battlefield.findShortestPath(startNode, targetNode);
                //console.log(path);
                //reset thông tin node cũ của unit
                battlefield.setUnit(startNode.x, startNode.y, null);
                battlefield.setIsWalkable(startNode.x, startNode.y, true);
                //di chuyển unit sang node mới
                battlefield.setUnit(path[0].x, path[0].y, unit);
                battlefield.setIsWalkable(path[0].x, path[0].y, false);
                //nếu là Đội khách thì đảo path vì đã xoay sân đấu ở arrivalPhase
                if(unit.owner == battlefield.away && battlefield.away != "PvE")
                    path.reverse();
                return [path[0].x, path[0].y];
            }
        }
        else{
            //tìm đường đi ngắn nhất tới mục tiêu
            let path = battlefield.findShortestPath(startNode, targetNode);
            //console.log(path);
            //reset thông tin node cũ của unit
            battlefield.setUnit(startNode.x, startNode.y, null);
            battlefield.setIsWalkable(startNode.x, startNode.y, true);
            //di chuyển unit sang node mới
            console.log("battlefield.setUnit: " +unit.championName +"_"+unit._id+" > " + path[0].x + "-" + path[0].y)
            battlefield.setUnit(path[0].x, path[0].y, unit);
            battlefield.setIsWalkable(path[0].x, path[0].y, false);
            //nếu là Đội khách thì đảo path vì đã xoay sân đấu ở arrivalPhase
            if(unit.owner == battlefield.away && battlefield.away != "PvE"){
                return [(5-path[0].x), (5-path[0].y)];
                //path.reverse();
            }
            return [path[0].x, path[0].y];
        }
    }
    else
        return null;
}
//#endregion

async function instanceRoom(roomName){
    const rerollProbability = await getRerollProbabilityByLevel(2);
    const unitShop = [];
    for (let i = 0; i < 5 ; i ++) {
        var unit = await getRandomUnit(rerollProbability);
        unit.currentLevel = unit.level[0]; 
        unitShop.push(unit);
    }
    for(var kv in Matchmaking.getRoomFindingMatch(roomName)){
        const player = Matchmaking.getRoomFindingMatch(roomName)[kv];
        var playerStat = Rooms.addPlayer(roomName, player.username, player.profileImage, player.socketid, parseInt(kv));
        io.to(`${player.socketid}`).emit("update-player-stat    ", JSON.stringify(playerStat));
    }
    Rooms.initHexBattlefield(roomName);
    //console.log("instanceRoom: ");
    //console.log(Rooms.getPlayerList(roomName));
    //console.log(Rooms.getBattlefieldList(roomName));
}

async function getTraits(){
    try {
        let data = await Traits.find().lean();
        let traits = {};
        data.forEach(x => {
            traits[x.id] = x;
        });
        return traits;
    } catch (error) {
        console.error(error)
    }
}

async function combineItem(item1, item2){
    try {
        let idCombineItem = item1.recipe[item2.idItem];
        let item = await Items.findOne({idItem: idCombineItem}).lean();
        item._id = Math.random().toString(36).substring(2);
        console.error(item);
        return item;
    } catch (error) {
        console.error(error)
    }
}

function removeUnitFromBattlefield(_roomName, unit, _battlefieldName){
    try{
        let battlefield = Rooms.getBattlefield(_roomName, _battlefieldName);
        console.log("getNearestEnemy: " + unit.championName +"_"+unit._id);
        let hexNode = battlefield.getHexNode(unit);
        //reset thông tin node 
        battlefield.setUnit(hexNode.x, hexNode.y, null);
        battlefield.setIsWalkable(hexNode.x, hexNode.y, true);
    }
    catch{
        console.log("removeUnitFromBattlefield error");
    }
}
//-----------------------------------------------
module.exports.EmitToAllClientsInRoom = function (roomName, emit, data){
    io.in(roomName).emit(emit, data);
}

module.exports.EmitToClient = function (socketid, emit, data){
    io.to(socketid).emit(emit, data);
}
//Tăng cấp và thêm slot ra trận
module.exports.UpgradeLevelAllPlayer = function (_roomName){
    const playerList = Rooms.getPlayerList(_roomName).filter(function(x){ return x.hp > 0; });
    for(let player of playerList){
        player.level += 1;
        player.maxUnitInBattlefield += 1;
        io.to(player.socketid).emit("update-level", player.level);
    }
}
//Cập nhật tỉ lệ roll tướng theo cấp độ người chơi
module.exports.UpdateRerollProbabilityAllPlayer = async function (_roomName, _level){
    const playerList = Rooms.getPlayerList(_roomName).filter(function(x){ return x.hp > 0; });
    let chance = await RerollProbability.findOne({level: _level}).lean();
    for(let player of playerList){
        player.rerollProbability = chance;
        io.to(player.socketid).emit("update-rolling-chances", JSON.stringify(chance));
    }
}
//Cấp vàng cho người chơi ở mỗi vòng đấu mới
module.exports.AddGoldAllPlayer = function (_roomName, _goldGain){
    console.log("AddGoldAllPlayer")
    const playerList = Rooms.getPlayerList(_roomName).filter(function(x){ return x.hp > 0; });
    for(let player of playerList){
        player.gold += _goldGain;
        io.to(player.socketid).emit("update-gold", player.gold);
        console.log("AddGoldAllPlayer: " + player.username + " - " + player.gold)
    }
}

module.exports.UpgradeUnit = async function (_roomName){
    const playerList = Rooms.getPlayerList(_roomName).filter(function(x){ return x.hp > 0; });
    for(let player of playerList){
        //Note: Ưu tiên nâng cấp unit: "Có trang bị" > "Sân đấu" > "Hàng chờ"
        let unitsOnBench = Object.values(player.bench || {});
        let unitsOnBattlefield = Object.values(player.battlefield || {});
        //duyệt qua các unit có trên "Hàng chờ" của người chơi
        for(var i of Object.values(player.bench || {})){
            //unit có thể nâng cấp phải nhỏ hơn 3* 
            if(i.currentLevel.star < 3){
                //lọc các đơn vị giống tên và cùng số sao có trên "Hàng chờ" và "Sân đấu"
                let unitSameLevelOnBench = unitsOnBench.filter(x => x.championName == i.championName && x.currentLevel.star == i.currentLevel.star);
                let unitSameLevelOnBattlefield = unitsOnBattlefield.filter(x => x.championName == i.championName && x.currentLevel.star == i.currentLevel.star);
                //xóa các đơn vị đã lọc được để tránh lặp lại ở lần duyệt tiếp theo
                //unitsOnBench = unitsOnBench.filter(unit => !unitSameLevel.includes(unit));
                //nếu có đủ 3 unit cùng sao trên "Hàng chờ" hoặc "Sân đấu" => có thể nâng cấp
                if(unitSameLevelOnBench.length + unitSameLevelOnBattlefield.length >= 3){
                    //số lượng unit ở cấp độ tiếp theo có trên "Hàng chờ" và "Sân đấu"
                    let unitNextLevelOnBench = unitsOnBench.filter(x => x.currentLevel.star < 2 && x.championName == i.championName && x.currentLevel.star == i.currentLevel.star + 1);
                    let unitNextLevelOnBattlefield = unitsOnBattlefield.filter(x => x.currentLevel.star < 2 && x.championName == i.championName && x.currentLevel.star == i.currentLevel.star + 1);
                    //nếu có đủ 2 unit ở cấp độ tiếp trên "Hàng chờ" hoặc "Sân đấu" => có thể nâng cấp tiếp 
                    //VD: có 3 unit 1* và 2 unit 2* => có thể nâng cấp unit 3*
                    if(unitNextLevelOnBench.length + unitNextLevelOnBattlefield.length >= 2){
                        //nếu có unit trên "Sân đấu" => ưu tiên nâng cấp
                        if(unitNextLevelOnBattlefield.length > 0){
                            unitNextLevelOnBattlefield[0].currentLevel = unitNextLevelOnBattlefield[0].level[unitNextLevelOnBattlefield[0].currentLevel.star];
                        }
                        else{
                            unitNextLevelOnBench[0].currentLevel = unitNextLevelOnBench[0].level[unitNextLevelOnBench[0].currentLevel.star]; 
                        }
                    }
                    else{
                        //nếu có unit trên "Sân đấu" => ưu tiên nâng cấp
                        if(unitSameLevelOnBattlefield.length > 0){
                            unitSameLevelOnBattlefield[0].currentLevel = unitSameLevelOnBattlefield[0].level[unitSameLevelOnBattlefield[0].currentLevel.star];
                        }
                        else{
                            unitSameLevelOnBench[0].currentLevel = unitSameLevelOnBench[0].level[unitSameLevelOnBench[0].currentLevel.star]; 
                        }
                    }
                }
            }
        }
    }
}

//làm mới miễn phí unit shop cho người chơi mỗi khi bắt đầu vòng đấu mới
module.exports.RefreshUnitShopAllPlayer = async function (_roomName){
    const playerList = Rooms.getPlayerList(_roomName).filter(function(x){ return x.hp > 0; });
    for(let player of playerList){
        if(player.lockedUnitShop == false){
            const newUnits = await refreshUnitShop(player);
            io.to(player.socketid).emit("refresh-unit-shop-success", JSON.stringify(newUnits));
        }
    }
}

//khóa đội hình trước khi vào trận đấu, nếu còn trống slot trên "Sân đấu" => tự động thêm unit từ "Hàng chờ"
module.exports.LockFormationAtCombatPhase = function (_roomName, _username){
    var player = Rooms.getPlayer(_roomName, _username);
    const emptySlot = player.maxUnitInBattlefield - Object.keys(player.battlefield || {}).length;
    for(let i = 0; i < emptySlot; i++){
        if(Object.keys(player.bench || {}).length > 0){
            let previousNode = Object.keys(player.bench)[0];
            let previousNodeTag = "Bench";
            let unit = player.bench[previousNode];
            player.removeUnitOnBench(unit)
            let selectedNode = player.addUnitInBattlefield(unit).slot;
            let selectedNodeTag = "Battlefield"
            io.to(player.socketid).emit("drag-drop-unit-success", JSON.stringify(unit), previousNode, previousNodeTag, selectedNode, selectedNodeTag);
        }
        else{
            break;
        }
    }
}

//kích hoạt các tộc hệ của người chơi mỗi khi bắt đầu hoặc kết thúc trận đấu
module.exports.ActiveTraits = function (_player, _isActive){
    io.to(_player.socketid).emit("active-traits-success", _isActive);
}

module.exports.GetItemDrop = async function (_typeItem){
    try {
        let item = await Items.aggregate([{ $match: { typeItem : _typeItem } }, { $sample: { size: 1 } }]);
        item._id = Math.random().toString(36).substring(2);
        return item[0];
    } catch (error) {
        console.error(error)
        return null;
    }
}

module.exports.GetItemDrop1 = async function (_idItem){
    try {
        let item = await Items.findOne({ idItem : _idItem }).lean();
        item._id = Math.random().toString(36).substring(2);
        return item;
    } catch (error) {
        console.error(error)
        return null;
    }
}