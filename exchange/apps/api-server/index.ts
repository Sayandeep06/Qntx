import express from 'express'
import { orderRouter } from './routes/order'
import { klinesRouter } from './routes/klines'
import { depthRouter } from './routes/depth'
import { tickerRouter } from './routes/ticker'
import { userRouter } from './routes/user'
import cors from 'cors'
import { tradeRouter } from './routes/trades'

const app = express()
app.use(cors({
    origin:"*"
}))
app.use(express.json())

app.use('/api/v1', userRouter)
app.use('/api/v1', orderRouter)
app.use('/api/v1', klinesRouter)
app.use('/api/v1', depthRouter)
app.use('/api/v1', tickerRouter)
app.use('/api/v1', tradeRouter)

app.listen(3000, ()=>{
    console.log(`API Server: http://localhost:{3000}`)
})