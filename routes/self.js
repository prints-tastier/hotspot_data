import Router from "@koa/router";
import {User, UserPrivate} from "../schemas/user.js";
import {Event} from "../schemas/event.js";
import dotenv from "dotenv";
import koaBody from "koa-body";
import {bodyParser} from "@koa/bodyparser";
import {PutObjectCommand, PutObjectRequest$, S3} from "@aws-sdk/client-s3";
import mime, {extension} from "mime-types"
import * as fs from "fs/promises";
import fs_ from "fs";
import {S3Client} from "../s3.js";
import mongoose, {Mongoose} from "mongoose";
import {Sanitized} from "../schema_utils.js";

export {
    selfRouter,
    selfResRouter
}

dotenv.config();

const selfRouter = new Router({
    prefix: "/self",
});

selfRouter.use(bodyParser())

const selfResRouter = new Router({
    prefix: "/self",
})

selfResRouter.use(koaBody({
    multipart: true,
    uploadDir: "./tmp",
    // multiples: true
}))


selfRouter.get("/", async (ctx) => {
    console.log("self")

    let userId = ctx.state.userId

    if (!userId) {
        // user id didnt get passed down
        ctx.throw(500, "Token lost in transition")
    }

    console.log(`[GET] user userId=${userId}`)

    try {
        let user = await User.findOne({id: userId}, UserPrivate);

        if (!user) {
            ctx.throw(500, "Invalid internal user ID.")
        }

        user = user.toObject()

        let eventsCount = await Event.countDocuments({host: user.id})

        user.eventsCount = eventsCount

        ctx.state.response = {
            status: 200,
            body: user
        }
    } catch (err) {
        ctx.throw(404);
    }
})

selfRouter.put("/", async ctx => {
    const body = ctx.request.body

    let userId = ctx.state.userId

    if (!userId) {
        ctx.throw(404, "User not found.")
    }

    if (!body) {
        console.log("No body, 200")
        ctx.state.response.status = 200;
        return
    }

    console.log(`[PUT] user userId=${userId}`)

    let update = Sanitized(User.schema, body, ["id", "dateJoined", "pictureUrl", "password"]);

    try {
        await User.updateOne({id: userId}, update);
    } catch (e) {
        let code = e.code

        if (code === 11000) {
            // duplicate
            let field = Object.keys(e.keyPattern)[0]

            switch (field) {
                case "username":
                    ctx.state.response.body.error.message = "An account with this username already exists."
                    ctx.throw(409, "An account with this username already exists.")
                    break;
                case "email":
                    ctx.state.response.body.error.message = "An account with this email already exists."
                    ctx.throw(409, "An account with this email already exists.")
                    break;
                default:
                    ctx.throw(409, "An error occurred.")
            }
        }
        else {
            console.log(e)
        }

        ctx.state.response.status = 200
    }
})