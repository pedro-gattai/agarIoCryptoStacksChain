"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameStatus = exports.GameMode = void 0;
var GameMode;
(function (GameMode) {
    GameMode["BATTLE_ROYALE"] = "battle_royale";
    GameMode["TIME_ATTACK"] = "time_attack";
    GameMode["TEAM_MODE"] = "team_mode";
})(GameMode || (exports.GameMode = GameMode = {}));
var GameStatus;
(function (GameStatus) {
    GameStatus["WAITING"] = "waiting";
    GameStatus["ACTIVE"] = "active";
    GameStatus["FINISHED"] = "finished";
})(GameStatus || (exports.GameStatus = GameStatus = {}));
