import Router from "@koa/router";
import {HttpError} from "koa";
import mongoose from "mongoose";
import {User, UserPrivate, UserPublic} from "../schemas/user.js";
import {hash_password} from "../passwords.js";

export {
    userRouter
}

const userRouter = new Router({
    prefix: "/users",
});

userRouter.get("/:id", async (ctx) => {
    const queryParams = ctx.request.params

    let userId = queryParams.id

    if (!userId) {
        ctx.throw(404, "User not found.")
    }

    console.log(`[GET] user userId=${userId}`)

    try {
        let user = await User.findOne({id: userId}, UserPublic);

        ctx.state.response.status = 200;
        ctx.state.response.body = user;
    } catch (err) {
        ctx.throw(404, "User not found.")
    }
})