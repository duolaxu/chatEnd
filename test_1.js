const express = require('express');
const app = express();
const fetch = require("node-fetch");


let wss = require('ws').Server
wss = new wss({ port: 8080 }); // websocket通信端口 8080

let clients = [];


app.all("*", function (req, res, next) { // 允许所有请求访问
    //设置允许跨域的域名，*代表允许任意域名跨域
    res.header("Access-Control-Allow-Origin", "*");
    //允许的header类型
    res.header("Access-Control-Allow-Headers", "*");
    //跨域允许的请求方式 
    res.header("Access-Control-Allow-Methods", "DELETE,PUT,POST,GET,OPTIONS");
    if (req.method.toLowerCase() == 'options')
        res.send(200);  //让options尝试请求快速结束
    else
        next();
});

async function getAccessToken() {
    const res = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=wx8841e9ac9c9acf37&secret=b74755c0b5cad0dd203775dd15337dab`)
    // console.log("res = ",res.json());
    return await res.json();
}

async function getOpenId(data) {
    const res = await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${data}`,
        {
            method: 'post',
            body: JSON.stringify({
                access_token: data,
                touser: 'og0eg4lHwMIZG0SQW_vMhqUQnzqI',
                template_id: '8KzzdaK5uwcyb_4DVXP9H6aP_2XM6AN5agJGvQU_bpE',
                page: '/pages/myMessage/index',
                data: {
                    "thing2": {
                        "value": "你有一条新消息"
                    },
                    "time3": {
                        "value": '2022-11-24'
                    },
                    "thing4": {
                        "value": "duola"
                    },
                },
                miniprogram_state: 'developer',
                lang: 'zh_CN',
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
    return await res.json();
}
// https://api.weixin.qq.com/cgi-bin/openapi/rid/get?access_token
async function getRid(data) {
    console.log("RID = ", data);
    const res = await fetch(`https://api.weixin.qq.com/cgi-bin/openapi/rid/get?access_token=${data}`,
        {
            method: 'post',
            body: JSON.stringify({
                access_token: data,
                rid: '637f2b3d-55f060d6-5050ed2a'
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
    return await res.json();
}


wss.on('connection', async (ws, req) => { // 开始建立连接，ws表示客户端，req.headers表示请求头

    // const accessData = await getAccessToken();
    // console.log("凭证 = ", accessData);
    // const resData = await getOpenId(accessData.access_token);
    // console.log("redData = ", resData);
    let isAbnormal = false; // 是否为异常连接断开
    let smallUid = 0; // uid值小的一方
    let bigUid = 0; // uid大的一方
    let uid1 = parseInt(req.headers.userid1);
    let uid2 = parseInt(req.headers.userid2);
    if (uid1 > uid2) {
        smallUid = uid2;
        bigUid = uid1;
    } else {
        smallUid = uid1;
        bigUid = uid2;
    }
    let userId = `'${smallUid},${bigUid}'`; // 数据库中存储的uid

    for (let i = 0; i < clients.length; i++) { // 这里表示连接为同一个客户端连接
        if (clients[i].sessionId == req.headers.sessionid) { // 未跳出聊天界面
            console.log("类型1");
            clients[i].ws = ws;
            isAbnormal = true;
            const db = require("./database");
            await db.query(`select * from chat where userId=${userId}`, data => { // 查询uid对应的数据

                if (data.length != 0) {
                    if (data[0].unreadId == req.headers.userid1) {
                        const db = require("./database");
                        db.query(`update chat set newsNumber=0 where userId=${userId}`, data => {
                            console.log("消息已读");
                        })
                    }
                    ws.send(JSON.stringify({
                        message: data[0].chatMessage,
                        newsNumber: data[0].newsNumber,
                        unreadId: data[0].unreadId,
                        code: 0,
                    }))
                } else {
                    ws.send(JSON.stringify({
                        message: '',
                        newsNumber: 0,
                        unreadId: 0,
                        code: 0,
                    }))
                }
            })
            break;
        } else if (clients[i].userId_1 == uid1 && clients[i].userId_2 == uid2) { // 同一台主机打开了另一个聊天界面(一个主机只对应一个聊天界面)
            console.log("类型2");
            clients[i].ws = ws;
            clients[i].sessionId = req.headers.sessionid;
            isAbnormal = true;
            const db = require("./database");
            await db.query(`select * from chat where userId=${userId}`, data => {

                if (data.length != 0) {
                    if (data[0].unreadId == req.headers.userid1) {
                        const db = require("./database");
                        db.query(`update chat set newsNumber=0 where userId=${userId}`, data => {
                            console.log("消息已读");
                        })
                    }
                    ws.send(JSON.stringify({
                        message: data[0].chatMessage,
                        newsNumber: data[0].newsNumber,
                        unreadId: data[0].unreadId,
                        code: 0,
                    }))
                } else {
                    ws.send(JSON.stringify({
                        message: '',
                        newsNumber: 0,
                        unreadId: 0,
                        code: 0,
                    }))
                }
            })
            break;
        }
    }
    if (!isAbnormal) { // 新的聊天主机
        console.log("循环不生效");
        let userId_1 = req.headers.userid1; // 每一个userId对应一台设备
        let userId_2 = req.headers.userid2;
        clients.push({
            ws,
            userId_1,
            userId_2,
            sessionId: req.headers.sessionid
        })
        const db = require("./database");
        await db.query(`select * from chat where userId=${userId}`, data => {

            if (data.length != 0) {
                if (data[0].unreadId == req.headers.userid1) {
                    const db = require("./database");
                    db.query(`update chat set newsNumber=0 where userId=${userId}`, data => {
                        console.log("消息已读");
                    })
                }
                ws.send(JSON.stringify({
                    message: data[0].chatMessage,
                    newsNumber: data[0].newsNumber,
                    unreadId: data[0].unreadId,
                    code: 0,
                }))
            } else {
                ws.send(JSON.stringify({
                    message: '',
                    newsNumber: 0,
                    unreadId: 0,
                    code: 0,
                }))
            }
            // console.log("data = ",data);
        })
    }
    console.log("连接数量_1 = ", clients.length);
    // 上面只是单纯的获取消息记录


    ws.on('message', async msg => { // 这里开始接收消息
        let unreadId = 0;
        console.log("连接数量_2 = ", clients.length);
        let data = `${msg}`;
        let message = data.split("&?session=")[0];
        console.log("message_1 = ", message);
        let sessionId = data.split("&?session=")[1];

        let user_1 = 0;
        let user_2 = 0;
        let lent = clients.length;
        const db = require("./database");

        let clients_1 = ''; // 发送消息的一端
        let clients_2 = ''; // 接收消息的一端

        for (let i = 0; i < lent; i++) {
            if (clients[i].sessionId == sessionId) { // 主机1，这里逻辑没问题
                user_1 = clients[i].userId_1;
                user_2 = clients[i].userId_2;
                clients_1 = clients[i].ws;
                unreadId = clients[i].userId_2;
                break;
            }
        }
        for (let i = 0; i < lent; i++) {
            if (clients[i].userId_1 == user_2 && clients[i].userId_2 == user_1) {
                clients_2 = clients[i].ws;
                break;
            }
        }
        // 查找到发送端和接收端的主机
        await db.query(`select * from chat where userId=${userId}`, data => {
            message = message + `userId_${user_1}`;
            console.log("message_2 = ", message);
            let newsNumber = 0;
            let chatMysqlData = data;
            // 嗯哼userId1&
            if (data.length == 0) { // 二者从未发送给消息
                console.log("位置1");
                // db.query(`insert into chat(userId,chatMessage) values(${userId},'${message}&')`, data => {
                //     clients_1 && clients_1.send(message + '&');
                //     clients_2 && clients_2.send(message + '&');
                // });
                console.log("smallUid = ", smallUid);
                console.log("bigUid = ", bigUid);
                db.query(`select userId,userName,userImg from customer where userId=${smallUid} or userId=${bigUid}`, data_1 => {
                    // db.query(`insert into`)
                    console.log("dat = ", data_1.length);
                    let smallData = {};
                    let bigData = {};
                    if (data_1.length == 1) {
                        smallData = data_1[0];
                        bigData = data_1[0];
                    } else if (data_1.length > 1) {
                        if (data_1[0].userId < data_1[1].userId) {
                            smallData = data_1[0];
                            bigData = data_1[1];
                        } else {
                            smallData = data_1[1];
                            bigData = data_1[0];
                        }
                    }

                    console.log("断点1");
                    db.query(`insert into chat(userId,chatMessage,userName_1,userImg_1,userName_2,userImg_2,isNew,newsNumber,unreadId) 
                    values(${userId},'${message}&','${smallData.userName}','${smallData.userImg}',
                    '${bigData.userName}','${bigData.userImg}',${!clients_2 ? 'true' : 'false'},${!clients_2 ? newsNumber + 1 : 0}
                    ,${unreadId})`, data_2 => {

                        clients_1 && clients_1.send(JSON.stringify({
                            message: message + '&',
                            newsNumber: clients_2 ? 0 : 1,
                            unreadId: clients_2 ? 0 : req.headers.userid2,
                            code: 0,
                        }));
                        clients_2 && clients_2.send(JSON.stringify({
                            message: message + '&',
                            newsNumber: 0,
                            unreadId: 0,
                            code: 0,
                        }));
                    });
                });
            } else {
                console.log("位置2");
                let mysqlMessage = data[0].chatMessage;
                let totalMessage = mysqlMessage + message;
                console.log("message_3 = ", message);
                newsNumber = data[0].newsNumber;
                console.log("smallUid = ", smallUid);
                console.log("bigUid = ", bigUid);
                db.query(`select userId,userName,userImg from customer where userId=${smallUid} or userId=${bigUid}`, data_1 => {
                    // db.query(`insert into`)
                    let smallData = {};
                    let bigData = {};
                    // console.log("data[0] = ", data[0]);
                    // console.log("data[1] = ", data[1]);
                    if (data_1.length == 1) {
                        smallData = data_1[0];
                        bigData = data_1[0];
                    } else if (data_1.length > 1) {
                        if (data_1[0].userId < data_1[1].userId) {
                            smallData = data_1[0];
                            bigData = data_1[1];
                        } else {
                            smallData = data_1[1];
                            bigData = data_1[0];
                        }
                    }

                    // console.log("smallData = ", smallData);
                    // console.log("bigData = ", bigData);
                    // console.log("AAAA = ", !clients_2 ? newsNumber + 1 : 0);
                    // console.log("BBBB = ", !clients_1 ? newsNumber + 1 : 0);
                    db.query(`update chat set chatMessage='${totalMessage}&',userName_1='${smallData.userName}',
                    userImg_1='${smallData.userImg}',userName_2='${bigData.userName}',userImg_2='${bigData.userImg}',
                    isNew=${!clients_2 ? 'true' : 'false'},newsNumber=${!clients_2 ? newsNumber + 1 : 0},unreadId=${unreadId} where userId=${userId}`, data_2 => {
                        clients_1 && clients_1.send(JSON.stringify({
                            message: chatMysqlData[0].chatMessage + message + '&',
                            newsNumber: clients_2 ? 0 : (parseInt(data[0].newsNumber) + 1),
                            unreadId: clients_2 ? 0 : req.headers.userid2,
                            code: 0,
                        }));
                        clients_2 && clients_2.send(JSON.stringify({
                            message: chatMysqlData[0].chatMessage + message + '&',
                            newsNumber: 0,
                            unreadId: 0,
                            code: 0,
                        }));
                    });
                });

                // db.query(`update chat set chatMessage='${totalMessage}&' where userId=${userId}`, data => {
                //     clients_1 && clients_1.send(totalMessage + '&');
                //     clients_2 && clients_2.send(totalMessage + '&');
                // });
            }

        })

    })

    ws.on('close', (msg, data, res) => {
        let sessionArr = `${data}`.split("sessionId=");
        console.log("sessionArr = ", sessionArr);
        console.log("req = ", req);
        // if (sessionArr.length > 1) {
        //     let sessionId = sessionArr[1];
        let index = -1;
        for (let i = 0; i < clients.length; i++) {
            if ((clients[i].userId_1 = req.headers.userid1) && (clients[i].userId_2 = req.headers.userid2)) {
                index = i;
                break;
            }
        }
        clients.splice(index, 1);
        // }
        console.log("连接数量_3 = ", clients.length);
    })
})