import express from 'express'
export const orderRouter = express.Router()
import { prisma } from 'db'

orderRouter.post('/order', (req, res)=>{
    
})