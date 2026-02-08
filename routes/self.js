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
    const userId = ctx.state.userId

    const body = ctx.request.body

    if (!userId) {
        ctx.throw(500, "Token lost in transition")
    }

    // exclude immutable fields including password
    // use POST self/password for self password reset
    // TODO impl POST self/password
    const updateBody = Sanitized(User.schema, body, ["id", "dateJoined", "password"])

    // TODO enforce PUT constraint so full document is required

    try {
        console.log(`Updating user - userId=${userId}`)
        await User.updateOne({id: userId}, updateBody)
        console.log("User updated")
    } catch (err) {
        console.log("User update failed")
        console.log(err)

        let code = err.code

        if (code === 11000) {
            // duplicate
            let field = Object.keys(err.keyPattern)[0]

            if (field === "username") {
                ctx.throw(400, "An account with this username already exists.")
            } else if (field === "email") {
                ctx.throw(400, "An account with this email already exists.")
            }
        }
        ctx.throw(500)
    }

    ctx.state.response.status = 200;

    console.log("[PUT] updateBody", updateBody)
})

selfResRouter.post("/picture", async ctx => {
    let userId = ctx.state.userId
    let files = ctx.request.files

    if (!files) {
        ctx.throw(400)
    }

    let images = Object.keys(files).map(key => files[key])

    if (images.length !== 1) {
        ctx.throw(400)
    }

    let image = images[0]

    let source = image.filepath
    let mimeType = image.mimetype
    let ext = mime.extension(mimeType)
    let name = `${crypto.randomUUID()}.${ext}`

    let stream = fs_.createReadStream(source)

    let putRequest = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: name,
        Body: stream,
        ContentType: mimeType,
    })

    try {
        await S3Client.send(putRequest)

        await fs.unlink(source)
    } catch (e) {
        console.log(e)
        ctx.throw(500)
    }
})