import express from 'express'
export const orderRouter = express.Router()
import { middleware } from '../middleware'

orderRouter.post('/order', middleware, async (req, res)=>{
    
})