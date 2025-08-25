import * as ws from 'ws';

type usersSchema = {
    id: string,
    socket: ws.WebSocket,
    market: string[]
}[]

type subSchema = {
    [market: string]: usersSchema
}

export class User{
    private static instance: User;
    private users: usersSchema;
    private subs: subSchema;
    constructor(){
        this.users = []
        this.subs = {}
    }

    public static getInstance(){
        if(!this.instance){
            this.instance = new User();
        }
        return this.instance
    }

    public addUser(socket: ws.WebSocket){
        const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        this.users.push({
            id,
            socket: socket,
            market: []
        })
        return id;
    }

    public subscribe(userId: string, market: string){
        try{
            const user = this.users.find(u => u.id === userId);

            if(!user){
                console.log("User doesn't exist")
                return;
            }

            if (!user.market.includes(market)) {
                user.market.push(market);
            }

            if(!this.subs[market]){
                this.subs[market] = []
            }
            const alreadyExists = this.subs[market].some(u => u.id === userId);
            if(!alreadyExists){
                this.subs[market].push(user)
            }
        }catch(error){
            console.log("Error while subscribing to ws server")
        }
    }

    public unsubscribe(userId: string, market: string){
        try{
            const user = this.users.find(u => u.id === userId);

            if(!user){
                console.log("User doesn't exist")
                return;
            }

            user.market = user.market.filter(m => m !== market);

            if(this.subs[market]){
                this.subs[market] = this.subs[market].filter(u => u.id !== userId);
            }
        }catch(error){
            console.log("Error while unsubscribing to ws server")
        }
    }

    public removeUser(userId: string){
        try{
            const user = this.users.find(u => u.id === userId);
            if(!user){
                console.log("User doesn't exist")
                return;
            }
            const symbols: string[] = user.market;
            this.users = this.users.filter(u => u.id !== userId)

            symbols.forEach(symbol => {
                if(this.subs[symbol]){
                    this.subs[symbol] = this.subs[symbol].filter(u => u.id !== userId)
                }
            });
        }catch(error){
            console.log("error deleting user")
        }
    }
}