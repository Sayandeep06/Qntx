type usersSchema = {
    id: string,
    socket: WebSocket,
    market: string[]
}[]

type subSchema = {
    [market: string]: usersSchema
}

class User{
    public static socket: WebSocket | null = null
    private static instance: User;
    private users: usersSchema;
    private subs: subSchema;
    constructor(){
        this.users = []
        this.subs = {}
    }

    public static getInstance(){
        if(!this.getInstance){
            this.instance = new User();
        }
        return this.instance
    }

    public static addUser(ws: WebSocket){
        const instance = this.getInstance()
        const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        instance.users.push({
            id,
            socket: ws,
            market: []
        })
        return id;
    }

    public static subscribe(userId: string, market: string){
        try{
            const instance = this.getInstance();
            const user = instance.users.find(u => u.id === userId);

            if(!user){
                console.log("User doesn't exist")
                return;
            }

            instance.users.forEach(u => {
                if(u.id === userId){
                    u.market.push(market)
                }
                return u;
            })

            if(!instance.subs[market]){
                instance.subs[market] = []
            }
            const alreadyExists = instance.subs[market].some(u => u.id === userId);
            if(!alreadyExists){
                instance.subs[market].push(user)
            }
        }catch(error){
            console.log("Error while subscribing to ws server")
        }
    }



}