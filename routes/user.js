import Router from "@koa/router";
import {HttpError} from "koa";
import mongoose from "mongoose";
import {User, UserPrivate, UserPublic} from "../schemas/user.js";
import {hash_password} from "../passwords.js";

export {
    userRouter
}

const userRouter = new Router({
    prefix: "/user",
});

userRouter.use(async (ctx, next) => {
    try {
        await next()
    } catch (err) {
        console.log("an error occurred", ctx.status)
    }
})

userRouter.get("/", async (ctx) => {

    const queryParams = ctx.request.query

    let username = queryParams.username

    if (!username) {
        ctx.status = 400;

        throw new Error()
    }

    console.log(`[GET] user username=${username}`)

    try {
        let user = await User.findOne({username}, UserPublic);

        ctx.body = user;
        ctx.status = 200;
    } catch (err) {
        ctx.status = 404;

        throw new Error()
    }
})

userRouter.post("/", async ctx => {
    // TODO method: PUT
})