import { createClient } from "redis";
import type { RedisClientType } from "redis";

class RedisClient{
    private publisher: RedisClientType;
    private subsciber: RedisClientType;
    constructor(){
        this.publisher = createClient();
        this.subsciber = createClient();
        this.connect()
    }

    private async connect(){
        await this.publisher.connect();
        await this.subsciber.connect()
    }

}