import Router from "@koa/router";
import {Event, EventHostUserProjection, EventProjection} from "../schemas/event.js";
import {User} from "../schemas/user.js";
import {validateEmail} from "../validation.js";
import {hrefSelf} from "../utils.js";

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
        excludeHostId,

        startsBefore,
        endsBefore,
        startsAfter,
        endsAfter,
        after,
        before,

        limit,
        offset
    } = ctx.request.query

    console.log("events", userId, username, city, postcode)

    if (!offset) offset = 0;
    else offset = parseInt(offset);
    if (!limit) limit = 10;
    else limit = parseInt(limit);

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

    if (excludeHostId) {
        filter.host = { $ne: excludeHostId };
    }

    if (city) {
        filter["address.city"] = city;
    } else if (postcode) {
        filter["address.postcode"] = postcode;
    }

    if (startsBefore || startsAfter) {
        filter.startDate = {  };

        if (startsBefore) {
            filter.startDate["$lt"] = startsBefore;
        }
        if (startsAfter) {
            filter.startDate["$gt"] = startsAfter;
        }
    }

    if (endsBefore || endsAfter) {
        filter.endDate = {  };

        if (endsBefore) {
            filter.endDate["$lt"] = endsBefore;
        }
        if (endsAfter) {
            filter.endDate["$gt"] = endsAfter;
        }
    }

    if (before || after) {
        filter._id = {};

        if (before) {
            try {
                let beforeEvent = await Event.findOne({id: before}, {_id: 1});

                let eventDocumentId = beforeEvent._id

                filter._id["$lt"] = eventDocumentId;
            } catch (e) {
                console.log("$before error")
                console.error(e);
                ctx.throw(404, "Event not found");
            }
        }

        if (after) {
            try {
                let afterEvent = await Event.findOne({id: after}, {_id: 1});

                let eventDocumentId = afterEvent._id

                filter._id["$gt"] = eventDocumentId;
            } catch (e) {
                console.log("$after error")
                console.error(e);
                ctx.throw(404, "Event not found");
            }
        }
    }

    console.log(`GET /events - filter=${JSON.stringify(filter)}`);

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

    events = events.map (event => event.toObject())

    for (let event of events) {
        let hostId = event.host

        try {
            let hostUser = await User.findOne({id: hostId}, EventHostUserProjection);
            event.host = hostUser
        }
        catch (e) {
            console.error(e);
        }
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
        total: events.length,
        items: events,

        prev: null,
        next: null
    }

    let currentIndex = offset + limit
    let lastIndex = count - 1

    let queryParams = ctx.request.query

    if (offset >= limit) {
        queryParams.offset -= limit
        ctx.state.response.body.prev = hrefSelf("/events", queryParams)
    }

    if (currentIndex < lastIndex) {
        queryParams.offset += limit
        ctx.state.response.body.next = hrefSelf("/events", queryParams)
    }


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