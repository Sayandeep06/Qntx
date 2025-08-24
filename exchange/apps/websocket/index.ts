//make users 
//ws.on message subscribe add them to the stuff
//if they exit remove and send unsubscribe 
//make users to subscriptions 
//subscriptions to users
import { User } from './Manager';
import { WebSocketServer } from 'ws';
import * as ws from 'ws';

const wss = new WebSocketServer({port:8080});

wss.on('connection', (ws: ws.WebSocket)=>{
    User.getInstance().addUser(ws)
    ws.on('message', (message: string)=>{
        
    })
})