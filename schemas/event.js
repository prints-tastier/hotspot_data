import mongoose from "mongoose";
import {validatePostcode} from "../validation.js";
import {capitalize, formatPostcode} from "../utils.js";

export {
    Event,
    EventProjection,
    EventHostUserProjection
}

const addressSchema = mongoose.Schema({
    addressLine1: {
        type: String,
        required: true,
    },
    addressLine2: {
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
            message: 'Please enter a valid postcode.',
        }
    }
}, {strict: true, _id: false})

const pictureSchema = mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
    },

    url: {
        type: "string",
        required: true,
    }
}, {strict: true, _id: false})

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
        type: Date,
        required: false,
        validate: {
            message: "Please enter a valid end date.",
            validator: function (date) {
                return date > this.startDate
            }
        }
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
        type: Date,
        required: true,
        validate: {
            message: "Please enter a valid start date.",
            validator: function (date) {
                return date >= new Date()
            }
        }
    },

    title: {
        type: "string",
        required: true,
    }
})

eventSchema.pre("save", function () {
    console.log("THIS-----", this)

    this.address.postcode = formatPostcode(this.address.postcode)
})

const Event = mongoose.model("Event", eventSchema, "Events");

const EventProjection = {_id: 0, address: {_id: 0}}
const EventHostUserProjection = {_id: 0, id: 1, username: 1, name: 1, pictureUrl: 1}