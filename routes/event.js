import Router from "@koa/router";
import {Event} from "../schemas/event.js";
import {User} from "../schemas/user.js";

export {
    eventRouter
}

const eventRouter = new Router();

eventRouter.get("/event", async (ctx, next) => {
    let eventId = ctx.request.query.id

    if (!eventId) {
        ctx.throw(404, "Event not found.")
    }

    try {
        // get event...
        let event = await Event.findOne({id: eventId})

        if (!event) {
            ctx.throw(404, "Event not found.")
        }

        // get host user
        let host = await User.findOne({userId: event.host}, {
            userId: 1, username: 1, name: 1, pictureUrl: 1
        })

        if (!host) {
            ctx.throw(500, "Couldn't resolve event host.")
        }

        event.host = host

        ctx.state.response = {
            status: 200,
            body: event
        }
    }
    catch (error) {
        ctx.throw(500, "Internal error occurred.");
    }
})

eventRouter.post("/event", async (ctx) => {
    let userId = ctx.state.userId;

    if (!userId) {
        ctx.throw(500, "User not found.")
    }

    let eventBody = ctx.request.body
})