import Router from "@koa/router";
import {Event, EventHostUserProjection, EventProjection} from "../schemas/event.js";
import {User} from "../schemas/user.js";
import {hrefSelf} from "../utils.js";
import {bodyParser} from "@koa/bodyparser";
import {Sanitized} from "../schema_utils.js";
import {DeleteObjectCommand, DeleteObjectsCommand, PutObjectCommand} from "@aws-sdk/client-s3";
import {Upload} from "@aws-sdk/lib-storage"
import ms from "ms"
import {S3Client} from "../s3.js";
import mime from "mime";
import {set} from "mongoose";
import {ErrorCode} from "../codes.js";

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

    let validationError = newEvent.validateSync({pathsToSkip: ["_id", "id", "host", "pictures", "_createdAt"]})
    let isValid = !validationError

    if (!isValid) {
        let {errors, errorMessage} = getRequestValidationErrors(validationError)

        console.log("IS VALID ERRORS", errors, errorMessage)

        ctx.state.response.body = {errors};
        ctx.throw(400, errorMessage)
    }

    // checkpoint: new event is valid

    let createdEvent

    try {
        let id = crypto.randomUUID()

        newEvent.id = id
        newEvent.host = userId
        newEvent.pictures = []
        eventBody._createdAt = new Date()

        createdEvent = await newEvent.save()
    } catch (e) {
        console.log(e)
        ctx.throw(500)
    }

    createdEvent = createdEvent.toObject()
    createdEvent = Sanitized(Event.schema, createdEvent)
    console.log("created", JSON.stringify(createdEvent, null, 2))

    let host

    try {
        host = await User.findOne({id: userId}, EventHostUserProjection)
    } catch (e) {
        console.error(e);
        ctx.throw(500)
    }

    createdEvent.host = host

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

eventRouter.put("/:id", async (ctx) => {
    let eventId = ctx.request.params.id

    let userId = ctx.state.userId;

    if (!userId) {
        ctx.throw(500, "User not found.")
    }

    let updateBody = ctx.request.body

    let eventUpdateFields = Object.keys(updateBody)

    let eventUpdate = {}

    for (let field of eventUpdateFields) {
        let value = updateBody[field]

        if (value !== undefined && value !== null) {
            eventUpdate[field] = value
        }
    }

    console.log("eventBody", eventUpdate)

    eventUpdate = Sanitized(Event.schema, eventUpdate, ["_id", "host", "pictures", "_createdAt"])
    let pathsToValidate = Object.keys(eventUpdate)

    console.log("sanitized update body", eventUpdate)

    console.log("eventUpdate keysToValidate", Object.keys(eventUpdate))

    eventUpdate = new Event(eventUpdate, null, {defaults: false})

    console.log("eventUpdate Model body", eventUpdate)

    let validationError = eventUpdate.validateSync(pathsToValidate)
    let isValid = !validationError

    if (!isValid) {
        let {errors, errorMessage} = getRequestValidationErrors(validationError)

        ctx.state.response.body = {errors}
        ctx.throw(400, errorMessage)
    }

    // checkpoint: new event is valid

    let event

    try {
        await Event.updateOne({id: eventId}, eventUpdate)
        event = await Event.findOne({id: eventId}, EventProjection)
    } catch (e) {
        console.log(e)
        ctx.throw(500)
    }

    event = event.toObject()

    let host

    try {
        host = await User.findOne({id: userId}, EventHostUserProjection)
    } catch (e) {
        console.error(e);
        ctx.throw(500)
    }

    event.host = host

    ctx.state.response.status = 201;
    ctx.state.response.body = event
})

eventRouter.delete("/:id", async ctx => {
    let eventId = ctx.request.params.id

    console.log("event", eventId)
    let userId = ctx.state.userId

    let event
    try {
        event = await Event.findOne({id: eventId}, EventProjection)
    } catch (e) {
        console.log(e)
        ctx.throw(500)
    }

    if (!event) {
        ctx.state.response.status = 204
        return
    }
    console.log("event host userId", event, event.host, userId)

    if (event.host !== userId) {
        ctx.throw(403, "Cannot edit event.")
    }

    try {
        await Event.deleteOne({id: eventId})
    } catch (e) {
        console.log(e)
        ctx.throw(500)
    }

    let host

    try {
        host = await User.findOne({id: event.host}, EventHostUserProjection)
    } catch (e) {
        console.log(e)
        ctx.throw(500)
    }

    event.host = host

    ctx.state.response.status = 200
    ctx.state.response.body = event
})

// event images
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
    let imageKey = `${imageId}.${extension}`


    // let putCommand = new PutObjectCommand({
    //     Bucket: process.env.S3_BUCKET_NAME,
    //     Key: imageId,
    //     ContentType: contentType,
    //     ContentLength: contentLength,
    //     Body: ctx.req,
    // })
    //
    // try {
    //     await S3Client.send(putCommand)
    // } catch (e) {
    //     console.error(e)
    //     ctx.throw(500)
    // }

    let upload = new Upload({
        client: S3Client,
        params: {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: imageKey,
            ContentType: contentType,
            Body: ctx.req,
        }
    })

    try {
        await upload.done()
    } catch (e) {
        console.log(e)
        ctx.throw(500)
    }

    // image uploaded
    event = event.toObject()
    let pictures = event.pictures

    let baseUrl = process.env.CDN_BASE_URL
    let imagesEndpoint = process.env.CDN_IMAGES_ENDPOINT

    let url = `${baseUrl}${imagesEndpoint}/${imageKey}`
    pictures.push({url, id: imageId, description: null})

    try {
        await Event.updateOne({id: eventId}, {pictures})
    } catch (e) {
        console.error(e)
        ctx.throw(500)
    }

    let updatedEvent

    try {
        updatedEvent = await Event.findOne({id: eventId})
        let host = await User.findOne({id: userId}, EventHostUserProjection)

        updatedEvent = updatedEvent.toObject()
        updatedEvent.host = host
    } catch (e) {
        console.error(e)
        ctx.throw(500)
    }

    ctx.state.response.status = 201;
    ctx.state.response.body = updatedEvent
})

eventRouter.delete("/:id/images", async ctx => {
    const eventId = ctx.params.id

    console.log("DELETE IMAGES")

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

    // event = event.toObject()

    let imageIds = event.pictures.map(it => `${it.id}.${mime.getExtension(mime.getType(it.url))}`)
    console.log(`IMAGE IDS: ${imageIds}`)

    if (imageIds.length > 0) {


        let deleteCommand = new DeleteObjectsCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Delete: {
                Objects: imageIds.map(it => ({Key: it}))
            }
        })

        try {
            await S3Client.send(deleteCommand)
        } catch (e) {
            console.error(e)
            ctx.throw(500)
        }
    }


    try {
        await Event.updateOne({id: eventId}, {pictures: []})

    } catch (e) {
        console.error(e)
        ctx.throw(500)
    }

    let response

    try {
        response = await Event.findOne({id: eventId}, EventProjection)
        let host = await User.findOne({id: userId}, EventProjection)
        response = response.toObject()
        response.host = host
    } catch (e) {
        console.error(e)
        ctx.throw(500)
    }

    ctx.state.response.status = 200;
    ctx.state.response.body = response
})

// event image

eventRouter.delete("/:eventId/images/:imageId", async ctx => {
    const eventId = ctx.params.eventId
    const imageId = ctx.params.imageId

    console.log("DELETE IMAGES")

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

    // event = event.toObject()

    let imageIds = event.pictures.map(it => it.id)
    console.log(`IMAGE IDS: ${imageIds}`)

    if (imageIds.length > 0 && imageIds.includes(imageId)) {
        let url = event.pictures.find(it => it.id === imageId).url
        let ext = mime.getExtension(mime.getType(url))
        let key = `${imageId}.${ext}`

        let deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key
        })

        try {
            await S3Client.send(deleteCommand)
        } catch (e) {
            console.error(e)
            ctx.throw(500)
        }
    }

    let newPictures = event.pictures.filter(it => it.id !== imageId)

    try {
        await Event.updateOne({id: eventId}, {pictures: newPictures})

    } catch (e) {
        console.error(e)
        ctx.throw(500)
    }

    let response

    try {
        response = await Event.findOne({id: eventId}, EventProjection)
        let host = await User.findOne({id: userId}, EventProjection)
        response = response.toObject()
        response.host = host
    } catch (e) {
        console.error(e)
        ctx.throw(500)
    }

    ctx.state.response.status = 200;
    ctx.state.response.body = response
})

function getRequestValidationErrors(validationError) {
    let errorMessages = []
    let errorObjects = []

    let errors = validationError.errors
    let fields = Object.keys(errors)

    errors = fields.map(it => errors[it])

    for (let error of errors) {
        if (error.name === "ValidatorError") {
            console.log("ERROR", error)
            let code = error.kind === "required" ? ErrorCode.MISSING_FIELD : ErrorCode.INVALID_FIELD

            let errorObject = {
                code,
                field: error.path,
                message: error.message
            }

            errorMessages.push(error.message)
            errorObjects.push(errorObject)
        }
    }
    console.log(JSON.stringify(errorMessages, null, 2))
    errorMessages = [...new Set(errorMessages)]
    let errorMessage = errorMessages.join(" ")

    return {errors: errorObjects, errorMessage}
}