import {RedisClient} from '../RedisManager'
import express from 'express'
import type { MessageFromEngine } from 'types';
export const depthRouter = express.Router()

depthRouter.get('/depth', async (req, res)=>{
    try{
        const {symbol} = req.query;
        const response: MessageFromEngine = await RedisClient.getInstance().publishSubscribe({
            type: 'GET_DEPTH',
            data:{
                market: symbol as string
            }
        })
        res.json(response)
    }catch(error){
        res.json(error)
    }
})