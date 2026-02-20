import mongoose from "mongoose";
import {validatePostcode} from "../validation.js";
import {capitalize, formatPostcode} from "../utils.js";

export {
    Ticket,
    TicketProjection,
}

const ticketSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
    },
    eventId: {
        type: String,
        required: [true, "A valid event ID is required."],
    },
    userId: {
        type: String,
        required: [true, "A valid user ID is required."],
    },

    createdAt: {
        type: Date,
        required: true,
        default: new Date()
    }
})

const Ticket = mongoose.model("Ticket", ticketSchema, "Tickets");

const TicketProjection = {_id: 0}