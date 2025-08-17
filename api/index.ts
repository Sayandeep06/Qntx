import express from 'express'
import { orderRouter } from './order'
import { klinesRouter } from './klines'
import { depthRouter } from './depth'
const app = express()
app.use(express.json())

app.use('/api/v1', orderRouter)
app.use('/api/v1', klinesRouter)
app.use('/api/v1', depthRouter)

app.listen(3000, ()=>{
    console.log(`http://localhost:{3000}`)
})