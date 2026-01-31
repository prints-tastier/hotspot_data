import mongoose from "mongoose";
import {validatePostcode} from "../validation.js";

export {
    Event
}

const addressSchema = mongoose.Schema({
    address_line_1: {
        type: String,
        required: true,
    },
    address_line_2: {
        type: String,
        required: false,
    },
    city: {
        type: String,
        required: true,
    },
    postcode: {
        type: String,
        required: true,
        validate: {
            validator: validatePostcode,
        }
    }
}, {strict: true})

const pictureSchema = mongoose.Schema({
    description: {
        type: "string"
    },
    url: {
        type: "string",
        required: true,
    }
})

const eventSchema = new mongoose.Schema({
    address: {
        type: addressSchema,
        required: true,
    },

    details: {
        type: "string",
        required: true,
    },

    directions: {
        type: "string",
        required: false,
    },

    endDate: {
        type: "string",
        required: false,
    },

    host: {
        type: "string",
        required: true,
    },

    id: {
        type: "string",
        required: true,
        unique: true,
    },

    pictures: [pictureSchema],

    startDate: {
        type: "string",
        required: true,
    },

    title: {
        type: "string",
        required: true,
    }
})

const Event = mongoose.model("Event", eventSchema, "Events");