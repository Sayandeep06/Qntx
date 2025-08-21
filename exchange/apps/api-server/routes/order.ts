import express from 'express'
export const orderRouter = express.Router()
import { middleware } from '../middleware'
import {RedisClient} from '../RedisManager'
import type {MessageToEngine, Order} from 'types'

orderRouter.post('/order', middleware, async (req, res)=>{
    const message: MessageToEngine = req.body.message
    RedisClient.getInstance().publishSubscribe(message)
})