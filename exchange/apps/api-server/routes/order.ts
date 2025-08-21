import express from 'express'
export const orderRouter = express.Router()
import { middleware } from '../middleware'
import {RedisClient} from '../RedisManager'
import type {MessageFromEngine} from 'types'

orderRouter.post('/order', middleware, async (req, res)=>{
    const { market, price, quantity, side, userId } = req.body;
    const response: MessageFromEngine = await RedisClient.getInstance().publishSubscribe({
        type: 'CREATE_ORDER',
        data: {
            market,
            price,
            quantity,
            side,
            userId
        }
    });
    res.json(response.data);
})

orderRouter.get('/order', middleware, async (req, res)=>{
    const market = req.query.market
    const userId = req.userId

    
})