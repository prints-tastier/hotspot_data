import Koa from 'koa';
import {bodyParser} from "@koa/bodyparser";
import {userRouter} from "./routes/user.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import {selfResRouter, selfRouter} from "./routes/self.js";
import {eventRouter} from "./routes/event.js";
import jwt from "jsonwebtoken";
import {ticketsRouter} from "./routes/tickets.js";

dotenv.config();
console.log("DB conn str", process.env.MONGO_URI);
await mongoose.connect(process.env.MONGO_URI)

const app = new Koa()
// app.use(bodyParser())

// logger
app.use(async (ctx, next) => {
    let log = `
    [${ctx.method} ${ctx._matchedRouteName}]
    `

    console.log(`${ctx.method} called`)
    await next()
})

// app wrapper
app.use(async (ctx, next) => {
    let session = await mongoose.startSession()
    ctx.state.session = session;

    try {
        ctx.state.session.startTransaction()
        ctx.state.response = {}

        console.log("app wrapper - proceeding...")
        await next()

        try {
            console.log("commiting transaction...")
            await session.commitTransaction()
            console.log("transaction committed")
        } catch (e) {
            console.log("transaction commit failed")
            console.error(e)
            ctx.throw(500)
        }

        console.log("app wrapper - returned with no error", ctx.state.response)
        ctx.status = ctx.state.response.status || 200
        ctx.message = ctx.state.response.message || undefined
        ctx.body = ctx.state.response.body

        console.log(`app wrapper - no error, exiting app...`, ctx.status)
    } catch (err) {
        ctx.state.session.abortTransaction()
        console.log("app wrapper - an error occurred", ctx.status)
        console.log(err)

        ctx.status = err.statusCode || 500;
        ctx.message = err.message
        ctx.body = {
            ...ctx.state.response.body,
            status: ctx.status,
            message: err.message
        }
    } finally {
        await ctx.state.session.endSession()
    }
})


// authorisation
app.use(async (ctx, next) => {
    const headers = ctx.request.headers
    let authHeader = headers.authorization

    if (!authHeader) {
        ctx.throw(400, "Need access token.")
    }

    let isValid = authHeader.startsWith("Bearer ")
    if (!isValid) {
        ctx.throw(400, "Invalid token.")
    }

    let token = authHeader.split(" ")[1]

    console.log(`${token.substring(0, 5)}...${token.substring(token.length - 5)}`)
    let payload = {}

    try {
        payload = jwt.verify(token, process.env.JWT_SECRET)
    } catch (e) {
        {
            console.log("ERROR VERIFYING")
            console.log(e)
            ctx.throw(401, "Invalid or expired token.")
        }
    }

    console.log(payload)

    let userId = payload.userId

    if (!userId) {
        ctx.throw(401, "Invalid or expired token.")
    }

    console.log("---- user", userId)

    ctx.state.userId = userId
    // ctx.state.userId = "2c9f3111-21f7-4c29-8267-634329818105"

    await next()
})


app.use(userRouter.routes())//.use(userRouter.allowedMethods())
app.use(selfRouter.routes())
app.use(selfResRouter.routes())
app.use(eventRouter.routes())
app.use(ticketsRouter.routes())

app.listen(3000)

