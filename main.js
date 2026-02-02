import Koa from 'koa';
import {bodyParser} from "@koa/bodyparser";
import {userRouter} from "./routes/user.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import {selfRouter} from "./routes/self.js";
import {eventRouter} from "./routes/event.js";
import jwt from "jsonwebtoken";

dotenv.config();
console.log("DB conn str", process.env.MONGO_URI);
await mongoose.connect(process.env.MONGO_URI)

const app = new Koa()
app.use(bodyParser())

// logger
app.use(async (ctx, next) => {
    let log = `
    [${ctx.method} ${ctx._matchedRouteName}]
    `

    console.log(`${ctx.method} called`)
    await next()
})

// errors
app.use(async (ctx, next) => {
    try {
        await next()

        ctx.status = ctx.state.response.status || 200
        ctx.message = ctx.state.response.message || undefined
        ctx.body = ctx.state.response.body

        console.log(`no error`, ctx.status)
    } catch (err) {
        console.log("an error occurred", ctx.status)

        ctx.status = err.statusCode || 500;
        ctx.message = err.message;
    }
})


// authorisation
app.use(async (ctx, next) => {
    // const headers = ctx.request.headers
    // let authHeader = headers.authorization
    //
    // if (!authHeader) {
    //     ctx.throw(400, "Need access token.")
    // }
    //
    // let isValid = authHeader.startsWith("Bearer ")
    // if (!isValid) {
    //     ctx.throw(400, "Need token.")
    // }
    //
    // let token = authHeader.split(" ")[1]
    //
    // let payload = jwt.verify(token, process.env.JWT_SECRET)
    //
    // let userId = payload.userId
    //
    // ctx.state.userId = userId
    ctx.state.userId = "2c9f3111-21f7-4c29-8267-634329818105"

    await next()
})


app.use(userRouter.routes())//.use(userRouter.allowedMethods())
app.use(selfRouter.routes())
app.use(eventRouter.routes())

app.listen(3000)

// mirror

