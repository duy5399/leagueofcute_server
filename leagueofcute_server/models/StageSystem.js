var Stage = require('./Stage.js');

var Stages = {};
module.exports = {
    instantiateNewStage  : function(roomName){
        var newStage = new Stage(roomName);
        Stages[roomName] = newStage;
        return newStage;
    },

    startBattle  : function(roomName){
        Stages[roomName].startBattle();
    },

    getAll : function(){
        return Stages;
    },
}