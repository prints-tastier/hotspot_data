import Router from "@koa/router";
import {Event, EventHostUserProjection, EventProjection} from "../schemas/event.js";
import {User} from "../schemas/user.js";
import {validateEmail} from "../validation.js";

export {
    eventRouter
}

const eventRouter = new Router({
    prefix: "/events",
});


// events
eventRouter.get("/", async ctx => {
    let {
        userId,
        username,
        city,
        postcode,

        limit,
        offset
    } = ctx.request.query

    console.log("events", userId, username, city, postcode)

    if (!offset) offset = 0;
    if (!limit) limit = 10;

    if (userId && username) {
        ctx.throw(400, "Cannot filter events by both userId and username.")
    }

    if (city && postcode) {
        ctx.throw(400, "Cannot filter events by both city and postcode.")
    }

    let filter = {}

    if (userId) {
        filter.host = userId
    } else if (username) {
        let user

        try {
            user = await User.findOne({username}, {id: 1});
        } catch (error) {
            console.error(error);
            ctx.throw(500);
        }

        if (!user) {
            ctx.throw(404);
        }

        filter.host = user.id;
    }

    if (city) {
        filter["address.city"] = city;
    } else if (postcode) {
        filter["address.postcode"] = postcode;
    }

    let events

    try {
        events = await Event.find(filter, EventProjection)
            .skip(offset)
            .limit(limit)
    } catch (error) {
        ctx.throw(500);
    }

    if (!events) {
        ctx.throw(404);
    }

    let count

    try {
        count = await Event.countDocuments(filter);
    } catch (error) {
        ctx.throw(500);
    }

    ctx.state.response.status = 200;
    ctx.state.response.body = {
        offset: offset,
        limit: limit,
        total: count,
        items: events,

        prev: null,
        next: null
    }

    let currentIndex = offset + limit
    let lastIndex = count - 1

    let queryParams = ctx.request.query

    if (offset <= limit) {
        queryParams.offset -= limit
    }

    if (currentIndex < lastIndex) {
        queryParams.offset += limit
    }

    ctx.state.response.body.next = hrefSelf("/events", queryParams)

    console.log(events)
})

// event
eventRouter.get("/:id", async ctx => {
    console.log("events/:id endpoint");
    let eventId = ctx.request.params.id

    if (!eventId) {
        ctx.throw(404, "Event not found.")
    }

    let event

    try {
        // get event...
        event = await Event.findOne({id: eventId}, EventProjection)
    } catch (error) {
        console.log(error)
        ctx.throw(500, "Event findOne error")
    }

    if (!event) {
        ctx.throw(404, "Event not found.")
    }

    console.log("event", event)

    let host

    try {
        // get host user
        host = await User.findOne({id: event.host}, EventHostUserProjection)
    } catch (error) {
        console.log(error)
        ctx.throw(500, "User findOne error while resolving event host.")
    }

    if (!host) {
        ctx.throw(500, "Couldn't resolve event host.")
    }

    event = event.toObject()

    event.host = host

    console.log("---------")
    console.log(event)

    ctx.state.response = {
        status: 200,
        body: event
    }

})

eventRouter.post("/", async (ctx) => {
    let userId = ctx.state.userId;

    if (!userId) {
        ctx.throw(500, "User not found.")
    }

    let eventBody = ctx.request.body
})