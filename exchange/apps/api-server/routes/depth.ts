import express from 'express'
export const depthRouter = express.Router()

depthRouter.get('/depth', (req, res)=>{
    const {symbol} = req.query

})