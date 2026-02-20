import Router from "@koa/router";
import {Event, EventHostUserProjection, EventProjection} from "../schemas/event.js";
import {User} from "../schemas/user.js";
import {hrefSelf} from "../utils.js";
import {bodyParser} from "@koa/bodyparser";
import {ResolveSchemaValidationErrors, Sanitized} from "../schema_utils.js";
import {DeleteObjectCommand, DeleteObjectsCommand, PutObjectCommand} from "@aws-sdk/client-s3";
import {Upload} from "@aws-sdk/lib-storage"
import ms from "ms"
import {S3Client} from "../s3.js";
import mime from "mime";
import {set} from "mongoose";
import {ErrorCode} from "../codes.js";
import {Ticket, TicketProjection} from "../schemas/ticket.js";

export {
    ticketsRouter
}

const ticketsRouter = new Router({
    prefix: "/tickets",
});

ticketsRouter.use(bodyParser());


// tickets
ticketsRouter.get("/", async (ctx) => {
    let userId = ctx.state.userId;

    if (!userId) {
        ctx.throw(500)
    }

    let offset = ctx.request.query.offset
    let limit = ctx.request.query.limit

    if (!limit) {
        limit = 10
    }

    limit = parseInt(limit)

    if (!offset) {
        offset = 0
    }

    offset = parseInt(offset)

    let ticketEventId = ctx.request.query.eventId
    let ticketUserId = ctx.request.query.userId

    let filter = {}

    if (ticketEventId) {
        filter["eventId"] = ticketEventId;
    }

    if (ticketUserId) {
        filter["userId"] = ticketUserId;
    }

    let tickets

    try {
        tickets = await Ticket.find(filter, TicketProjection)
            .skip(offset)
            .limit(limit)
    }
    catch (e) {
        console.log(e);
        ctx.throw(500)
    }

    let count;
    try {
        count = await Ticket.countDocuments(filter);
    }
    catch (e) {
        console.log(e);
        ctx.throw(500)
    }

    let total = tickets.length

    ctx.state.response.status = 200;
    ctx.state.response.body = {
        offset: offset,
        limit: limit,
        total,
        items: tickets,

        prev: null,
        next: null
    }

    let indexOfNext = offset + limit
    let lastIndex = count - 1

    let queryParams = ctx.request.query

    console.log(`DEBUG - offset=[${typeof offset}]${offset} limit=[${typeof limit}]${limit} indexOfNext=[${typeof indexOfNext}]${indexOfNext} lastIndex=[${lastIndex}]`)

    if (offset > 0) {
        let prevOffset = offset - limit
        prevOffset = Math.max(0, prevOffset)

        queryParams.offset = prevOffset
        ctx.state.response.body.prev = hrefSelf("/tickets", queryParams)
    }

    if (indexOfNext <= lastIndex) {
        let nextOffset = offset + limit
        queryParams.offset = nextOffset
        ctx.state.response.body.next = hrefSelf("/tickets", queryParams)
    }

    console.log(tickets)
})

ticketsRouter.post("/", async (ctx) => {
    let userId = ctx.state.userId;

    if (!userId) {
        ctx.throw(500, "User not found.")
    }

    let body = ctx.request.body

    console.log("eventBody", body)

    let ticketEventId = body.eventId
    let ticketUserId = body.userId

    if (!ticketEventId || !ticketUserId) {
        ctx.throw(400, "Please provide event ID and user ID in request body.")
    }

    // check exists
    let eventExists = (await Event.countDocuments({id: ticketEventId})) > 0

    if (!eventExists) {
        ctx.throw(404, "Event not found.")
    }

    let userExists = (await User.countDocuments({id: ticketUserId})) > 0;

    if (!userExists) {
        ctx.throw(404, "User not found.")
    }

    // checkpoint: event and user are valid

    let ticketId = crypto.randomUUID()
    let dateCreated = new Date();

    let cTicket = Sanitized(Ticket.schema, body)

    cTicket.id = ticketId
    cTicket.dateCreated = dateCreated

    let ticket = new Ticket(cTicket);

    try {
        await ticket.save();
    } catch (e) {
        let code = e.code

        if (code === 11000) {
            // mongodb: duplicate
            ctx.state.response.body = {
                errors: [{
                    code: ErrorCode.DUPLICATE_RESOURCE,
                    message: "The user already has a ticket for this event."
                }]
            }
            ctx.throw(400)
        }
    }

    ctx.state.response.status = 201
    ctx.state.response.body = cTicket
})

// ticket
ticketsRouter.get("/:id", async ctx => {
    console.log("tickets/:id endpoint");
    let userId = ctx.state.userId;

    let ticketId = ctx.params.id;

    if (!ticketId) {
        ctx.throw(404, "Ticket not found.")
    }

    let ticket

    try {
        // TODO add authorization: ticket holder can access, event host can access.
        ticket = await Ticket.findOne({id: ticketId}, TicketProjection)
    }
    catch (e) {
        console.log(e)
        ctx.throw(404)
    }

    ctx.state.response.status = 200
    ctx.state.response.body = ticket
})

ticketsRouter.delete("/:id", async ctx => {
    let userId = ctx.state.userId
    let ticketId = ctx.request.params.id

    let ticket

    try {
        ticket = await Ticket.findOne({id: ticketId}, TicketProjection)
    }
    catch (e) {
        console.log(e)
        ctx.throw(404)
    }

    if (!ticket) {
        ctx.throw(404)
    }

    try {
        await Ticket.deleteOne({id: ticketId})
    }
    catch (e) {
        console.log(e)
        ctx.throw(500)
    }

    ctx.state.response.status = 200
    ctx.state.response.body = ticket
})