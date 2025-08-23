import type { WebSocket } from "ws"
class User{
    public static socket: WebSocket | null = null
    private static instance: User;


    constructor(){
        
    }

    public static getInstance(){
        if(!this.getInstance){
            this.instance = new User();
        }
        return this.instance
    }

    public static addUser(ws: WebSocket){
        this.socket = ws;

        

    }

}