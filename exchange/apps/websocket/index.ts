import { User } from './Manager';
import { WebSocketServer } from 'ws';
import * as ws from 'ws';

const wss = new WebSocketServer({port:8080});
const userManager = User.getInstance();

wss.on('connection', (ws: ws.WebSocket)=>{
    const userId = userManager.addUser(ws);
    ws.on('message', (message: string)=>{
        const msg = JSON.parse(message)
        if(msg.type = 'SUBSCRIBE'){
            msg.market.forEach((symbol: string)=>{
                userManager.subscribe(userId, symbol)
            })
        }
        if(msg.type = 'UNSUBSCRIBE'){
            msg.market.forEach((symbol: string)=>{
                userManager.subscribe(userId, symbol)
            })
        }
    })
    ws.on('close',()=>{
        userManager.removeUser(userId)
    })
})