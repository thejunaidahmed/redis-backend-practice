import express from "express"
import dotenv from "dotenv"
import connectDB from "./config/db.js"
import userModel from "./model/user.model.js";
import { Redis } from "ioredis";

dotenv.config()


const app = express()
const redis = new Redis(process.env.REDIS_URL)

app.use(express.json())

app.get("/", (req, res) => {
    res.send("Hello from Redis")
})

app.post('/create', async (req, res) => {
    try {
        const { name, email, password } = req.body
        await redis.del("users")
        const user = await userModel.create({
            name,
            email,
            password
        })

        res.status(201).json({
            message: "User created successfully",
            user
        })
        
    } catch (error) {
        console.error("Error creating user:", error.message)
    }
})

app.get('/get', async (req, res) => { 
            try {

                const users =  await userModel.find()
                res.status(200).json({
                    message: "Users fetched successfully",
                    users
                })

            } catch (error) {
                console.error("Error fetching users:", error.message)
            }
})

app.get("/redis-get", async (req, res) => { 
    try {

        const cached = await redis.get("users")

        if (cached) {
            return res.status(200).json({
                message: "Users fetched successfully from Redis",
                cached: JSON.parse(cached)
            })
        }

        const users = await userModel.find()

        await redis.set("users", JSON.stringify(users))

        res.status(200).json({
            message: "Users fetched successfully from MongoDB and cached in Redis",
            users
        })
        
    } catch (error) {
        console.error("Error fetching users from Redis:", error.message)
    }
})


app.post("/send-otp", async (req, res) => { 
    try {
        const { email } = req.body

        const otp = Math.floor(100000 + Math.random() * 900000).toString()

        await redis.set(`otp:${email}`, otp, 'EX', 30) 
        return res.status(200).json({
            message: "OTP sent successfully",
            otp
        })
        
    } catch (error) {
        console.error("Error sending OTP:", error.message)
    }
}) 

app.post("/verify-otp", async (req, res) => { 
    try {
        const { email,otp } = req.body

        const cachedOtp = await redis.get(`otp:${email}`)

        if (!cachedOtp) {
            return res.status(400).json({
                message: "OTP expired or not found"
            })
        }

        if (cachedOtp !== otp) {
            return res.status(400).json({
                message: "Invalid OTP"
            })
        }

        await redis.del(`otp:${email}`)

        return res.status(200).json({
            message: "OTP verified successfully"
        })
        
    } catch (error) {
       console.error("Error verifying OTP:", error.message) 
    }
})



app.listen(process.env.PORT, () => {
    connectDB()
    console.log(`Server is running on port ${process.env.PORT}`)
})


