const server = require("ws").Server;
const s = new server({ port: 55555 });

let gameStatus = "lobby";
let countTime = 0;

let redPoint = 0;
let bluePoint = 0;

s.on("connection", (ws, req) => {
    //IDの作成
    let tmpID = makeID();
    ws.send("i " + tmpID);

    //参加者の情報を全て送る
    s.clients.forEach(function (client) {
        if (client != ws) {
            ws.send("j " + client.user.id + " " + client.user.name, ws);
            ws.send("u " + client.user.id + " " + client.user.team);
        }
    });

    let urlString = req.url.split("=");
    ws.user = {
        name: urlString[1],
        id: tmpID,
        team: null,
        position: {
            x: 0,
            y: 0,
            z: 0
        },
        rotation: {
            x: 0,
            y: 0,
            z: 0
        },
        hp: 100,
        isDead: false
    }
    console.log("ID : " + ws.user.id + "  Name : " + ws.user.name + "が参加しました。");

    //参加ユーザー情報を全員に送る
    sendInformationToClient("j " + ws.user.id + " " + ws.user.name, ws);


    ws.on("message", message => {
        let tmpData = message.toString().slice(2);
        let tmpDatas = (message.toString().slice(2)).split(" ");
        switch (message.toString().charAt(0)) {
            case 'p':
                let positions = tmpData.split(" ");
                ws.user.position.x = positions[0];
                ws.user.position.y = positions[1];
                ws.user.position.z = positions[2];
                ws.user.rotation.x = positions[3];
                ws.user.rotation.y = positions[4];
                ws.user.rotation.z = positions[5];
                break;

            case 't':
                console.log(ws.user.id + ":" + tmpData);
                sendInformationToClient("t " + ws.user.id + " " + tmpData, ws);
                break;

            case 'u':
                console.log(ws.user.id + "が" + tmpData + "チームに参加しました。");
                ws.user.team = tmpData;
                sendInformationToClient("u " + ws.user.id + " " + tmpData, ws);
                break;

            case 'd':
                s.clients.forEach(client => {
                    if (client.user.id == tmpDatas[0] && client.user.isDead == false) {
                        console.log(client.user.name + "が" + ws.user.name + "から" + tmpDatas[1] + "のダメージをうけました。");
                        client.user.hp -= tmpDatas[1];
                        client.send("d " + client.user.hp);
                        if (client.user.hp <= 0) {
                            kill(client.user.id, ws.user.name, client);
                        }

                    }
                });
                break;

            case 's':
                //ゲームの状態を更新
                changeGameStatus();
                break;

            default:
                console.log("予期しないコマンド：" + message);
                break;
        }

    });

    ws.on("close", message => {
        console.log(ws.user.name + " is disconnected");
        sendInformationToClient("l " + ws.user.id, ws);
        ws = null;
    });

});

function changeGameStatus() {
    switch (gameStatus) {
        case "lobby": //ゲーム前カウントダウン開始
            console.log("ゲームを開始します。");
            countTime = 3;
            countDown();
            gameStatus = "countDownBeforeStart";
            break;

        case "countDownBeforeStart": //ゲーム開始
            redPoint = 0;
            bluePoint = 0;
            console.log("ゲームを開始しました。");
            sendInformationToClient("s " + "start");
            countTime = 60;
            countDown();
            gameStatus = "game";
            break;

        case "game": //ゲーム終了
            console.log("ゲームを終了します。");
            sendInformationToClient("s " + "end");
            gameStatus = "lobby";
            break;
    }
}

function kill(name, byName, client) {
    client.user.isDead = true;
    if (client.user.team == "red") {
        bluePoint++;
    } else {
        redPoint++;
    }
    console.log(name + "が" + byName + "にキルされました。");
    sendInformationToClient("c " + name + "が" + byName + "にキルされました。");
    sendInformationToClient("s " + redPoint + " " + bluePoint);
    setTimeout(function () {
        client.user.isDead = false;
        client.send("r test");
        client.user.hp = 100;
    }, 5000);
}


function countDown() {
    sendInformationToClient("s " + countTime);
    countTime--;
    if (countTime < 0) {
        changeGameStatus();
    } else {
        setTimeout(countDown, 1000);
    }
}

setInterval(sendInformation, 1000 / 60);

function sendInformation() {
    //それぞれのクライアントに位置情報を送信
    s.clients.forEach(function (client) {
        s.clients.forEach(function (client2) {
            if (client != client2) {
                client.send("p " + client2.user.id + " " + client2.user.position.x + " " + client2.user.position.y + " " + client2.user.position.z + " " + client2.user.rotation.x + " " + client2.user.rotation.y + " " + client2.user.rotation.z);
            }
        });
    });
}

function sendInformationToClient(context, exceptUser) {
    if (arguments.length == 2) { //除外対象あり
        s.clients.forEach(function (client) {
            if (client != exceptUser) {
                client.send(context);
            }
        });
    } else { //除外対象なし
        s.clients.forEach(function (client) {
            client.send(context);
        });
    }
}

let IDList = [];
function makeID() {
    while (true) {
        let tmpID = Math.floor(Math.random() * 1000) + "-" + Math.floor(Math.random() * 1000);
        if (!IDList.includes(tmpID)) {
            IDList[IDList.length] = tmpID;
            break;
        }
    }
    return IDList[IDList.length - 1];
}