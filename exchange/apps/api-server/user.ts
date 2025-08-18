import express from 'express'
import z, { success } from 'zod'
export const userRouter = express.Router()
import { prisma } from 'db'

const userSchema = z.object({
    username: z.email(),
    password: z.string()
})

userRouter.post('/signup', async (req, res)=>{
    try{    
        const data = userSchema.safeParse(req.body)
        const user = await prisma.user.create({
            data: {
                username: data?.data?.username,
                password: data?.data?.password
            }
        })
        res.json({
            success: true,
            user: "user"
        })
   }catch(error){
        res.json({
            success: false,
            error: error
        })
   }
})

userRouter.post('/signin', async(req, res)=>{
    try{    
        const data = userSchema.safeParse(req.body)
        const user = await prisma.user.findFirst({
            data: {
                username: data?.data?.username,
                password: data?.data?.password
            }
        })
        res.json({
            success: true,
            user: "user"
        })
   }catch(error){
        res.json({
            success: false,
            error: error
        })
   }  
})
