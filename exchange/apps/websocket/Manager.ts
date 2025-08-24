import type { WebSocket } from "ws"

type userSchema = {
    id: string,
    socket: WebSocket
}[]

type subSchema = {
    [market: string]: userSchema
}

class User{
    public static socket: WebSocket | null = null
    private static instance: User;
    private user: userSchema;
    private subs: subSchema;
    constructor(){
        this.user = []
        this.subs = {}
    }

    public static getInstance(){
        if(!this.getInstance){
            this.instance = new User();
        }
        return this.instance
    }

    public static addUser(ws: WebSocket){

    }

}