import Router from "@koa/router";
import {User, UserPrivate} from "../schemas/user.js";
import {Event} from "../schemas/event.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

export {
    selfRouter
}

dotenv.config();

const selfRouter = new Router({
    prefix: "/self",
});


selfRouter.get("/", async (ctx) => {
    console.log("self")

    let userId = ctx.state.userId

    if (!userId) {
        // user id didnt get passed down
        ctx.throw(500)
    }

    console.log(`[GET] user userId=${userId}`)

    try {
        let user = await User.findOne({userId}, UserPrivate);

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

selfRouter.post("/", async ctx => {

})