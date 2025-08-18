import express from 'express'
import z, { success } from 'zod'
export const userRouter = express.Router()

const userSchema = z.object({
    username: z.email(),
    password: z.string()
})

userRouter.post('/signup', async (req, res)=>{
    try{    
        const data = userSchema.safeParse(req.body)
        /*
        const user = await prismaClient.user.create({
            data: {
                username: data?.username,
                password: data?.password
            }
        })
        */
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

userRouter.post('/signin', (req, res)=>{
    try{    
        const data = userSchema.safeParse(req.body)
        /*
        const user = await prismaClient.user.findFirst({
            data: {
                username: data?.username,
                password: data?.password
            }
        })
        */
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
