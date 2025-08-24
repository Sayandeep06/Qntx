/* 
type: typeof ON_RAMP,
data: {
    amount: string,
    userId: string,
    txnId: string
}
*/

import express from 'express'
export const balanceRouter = express.Router()
import { middleware } from '../middleware'
import type { MessageFromEngine } from 'types'
import { RedisClient } from '../RedisManager'

balanceRouter.post('/onramp', middleware, async (req, res)=>{
    try{
        const amount = await req.body.amount;
        const userId = req.userId as string

        const response: MessageFromEngine = await RedisClient.getInstance().publishSubscribe({
            type: 'ON_RAMP',
            data:{
                amount,
                userId
            }
        })
        res.json(response)
    }catch(error){
        res.json(error)
    }
})

balanceRouter.post('/balance', middleware, async (req, res)=>{
    try{

    }catch(error){
        
    }
})