import express from 'express'
export const tradeRouter = express.Router()
import { prisma } from 'db'

tradeRouter.get('/trades', async (req, res)=>{
    try{
        const {symbol, limit} = req.query

        res.json({
            success: true,
//          trades: 
        })
    }catch(error){
        res.json({
            success: false,
            error: error
        })
    }
})