import Router from "@koa/router";
import {HttpError} from "koa";
import mongoose from "mongoose";
import {User, UserPrivate, UserPublic} from "../schemas/user.js";
import {hash_password} from "../passwords.js";
import {Sanitized} from "../schema_utils.js";
import {bodyParser} from "@koa/bodyparser";

export {
    userRouter
}

const userRouter = new Router({
    prefix: "/users",
});

userRouter.use(bodyParser())

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

userRouter.put("/:id", async (ctx) => {
    const queryParams = ctx.request.params
    const body = ctx.request.body

    let userId = queryParams.id

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