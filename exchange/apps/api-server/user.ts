import { password } from 'bun'
import express from 'express'
import z from 'zod'
export const userRouter = express.Router()

const userSchema = z.object({
    username: z.email(),
    password: z.string()
})

userRouter.post('/signup', async (req, res)=>{
    const data = userSchema.safeParse(req.body)
/*
    const user = await prismaClient.user.create({
        data: {
            username: data?.username,
            password: data?.password
        }
    })
*/

    

})

userRouter.post('/signup', (req, res)=>{
    
})

userRouter.put('/signup', (req, res)=>{
    
})