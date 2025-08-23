//make users 
//ws.on message subscribe add them to the stuff
//if they exit remove and send unsubscribe 
//make users to subscriptions 
//subscriptions to users

import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({port:8080});

wss.on('connection', (ws)=>{
    //add socket to the user and then user to subsciber map
    //user.addUser(ws)
})