import Router from "@koa/router";
import {Event, EventHostUserProjection, EventProjection} from "../schemas/event.js";
import {User} from "../schemas/user.js";
import {hrefSelf} from "../utils.js";
import {bodyParser} from "@koa/bodyparser";
import {Sanitized} from "../schema_utils.js";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner"
import ms from "ms"
import {S3Client} from "../s3.js";
import mime from "mime";

export {
    eventRouter
}

const eventRouter = new Router({
    prefix: "/events",
});

eventRouter.use(bodyParser());


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
        filter.host = {$ne: excludeHostId};
    }

    if (city) {
        filter["address.city"] = city;
    } else if (postcode) {
        filter["address.postcode"] = postcode;
    }

    if (startsBefore || startsAfter) {
        filter.startDate = {};

        if (startsBefore) {
            filter.startDate["$lt"] = startsBefore;
        }
        if (startsAfter) {
            filter.startDate["$gt"] = startsAfter;
        }
    }

    if (endsBefore || endsAfter) {
        filter.endDate = {};

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

    events = events.map(event => event.toObject())

    for (let event of events) {
        let hostId = event.host

        try {
            let hostUser = await User.findOne({id: hostId}, EventHostUserProjection);
            event.host = hostUser
        } catch (e) {
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

eventRouter.post("/", async (ctx) => {
    let userId = ctx.state.userId;

    if (!userId) {
        ctx.throw(500, "User not found.")
    }

    let eventBody = ctx.request.body

    console.log("eventBody", eventBody)

    let sanitized = Sanitized(Event.schema, eventBody, ["_id"])

    let newEvent = new Event(sanitized)

    let validationError = newEvent.validateSync({pathsToSkip: ["_id", "id", "host"]})
    let isValid = !validationError

    let errorMessages = []

    if (!isValid) {
        let errors = validationError.errors
        // console.log(typeof errors, JSON.stringify(errors, null, 2))
        let fields = Object.keys(errors)
        // console.log(typeof errors, JSON.stringify(fields, null, 2))

        errors = fields.map(it => errors[it])
        // console.log(typeof errors, JSON.stringify(errors, null, 2))


        for (let error of errors) {
            console.log(`ERROR name - ${error.name}`)
            if (error.name === "ValidatorError") {
                // schema defined messsage
                console.log("ERROR", error)
                errorMessages.push(error.message)
            } else {
                if (error.path === "startDate") {
                    errorMessages.push("Please enter a valid start date.")
                } else if (error.path === "endDate") {
                    errorMessages.push("Please enter a valid end date.")
                }
            }
        }
        console.log(JSON.stringify(errorMessages, null, 2))

        let errorMessage = errorMessages.join(" ")
        ctx.throw(400, errorMessage)
    }

    let createdEvent

    try {
        let id = crypto.randomUUID()

        newEvent.id = id
        newEvent.host = userId

        createdEvent = await newEvent.save()
    } catch (e) {
        console.log(e)
        ctx.throw(500)
    }

    createdEvent = createdEvent.toObject()
    createdEvent = Sanitized(Event.schema, createdEvent)
    console.log("created", JSON.stringify(createdEvent, null, 2))

    ctx.state.response.status = 201;
    ctx.state.response.body = createdEvent
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

eventRouter.post("/:id/images", async ctx => {
    const eventId = ctx.params.id

    const userId = ctx.state.userId

    let event

    try {
        event = await Event.findOne({id: eventId}, {_id: 0, id: 1, host: 1, pictures: 1})
    } catch (e) {
        console.log(e)
        ctx.throw(500)
    }

    if (!event) {
        ctx.throw(404, "Event not found.")
    }

    if (event.host !== userId) {
        console.log(`host: ${event.host} user: ${userId}`)
        ctx.throw(403, "Cannot edit this event.")
    }

    console.log(event)

    // checkpoint: event exists and user can edit

    const contentType = ctx.request.type
    const contentLength = ctx.request.headers["content-length"]

    if (!contentType.startsWith("image/")) {
        ctx.throw(400, "Upload content must be an image.")
    }

    let extension = mime.getExtension(contentType)
    let imageId = crypto.randomUUID()
    imageId = `${imageId}.${extension}`


    let putCommand = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: imageId,
        ContentType: contentType,
        ContentLength: contentLength,
        Body: ctx.req,
    })

    try {
        await S3Client.send(putCommand)
    } catch (e) {
        console.error(e)
        ctx.throw(500)
    }

    // image uploaded
    event = event.toObject()
    let pictures = event.pictures

    let baseUrl = process.env.CDN_BASE_URL

    let url = `${baseUrl}/${imageId}`
    pictures.push({url, description: null})

    try {
        await Event.updateOne({id: eventId}, {pictures})
    } catch (e) {
        console.error(e)
        ctx.throw(500)
    }

    let updatedEvent

    try {
        updatedEvent = await Event.findOne({id: eventId})
    }
    catch (e) {
        console.error(e)
        ctx.throw(500)
    }

    ctx.state.response.status = 201;
    ctx.state.response.body = updatedEvent
})