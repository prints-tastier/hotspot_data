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
        required: [true, "Address line 1 is required."],
    },
    addressLine2: {
        type: String,
        required: false,
    },
    city: {
        type: String,
        required: [true, "City is required."],
    },
    postcode: {
        type: String,
        required: [true, "Postcode is required."],
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
        required: [true, "Address is required."],
    },

    details: {
        type: "string",
        required: [true, "Details are required."],
    },

    directions: {
        type: "string",
        required: false,
    },

    endDate: {
        type: Date,
        required: false,
        validate: {
            message: "End date must be after start date.",
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

    pictures: {
        type: [pictureSchema],
        required: true,
        default: [],
    },

    startDate: {
        type: Date,
        required: true,
        validate: {
            message: "Start date must be in the future.",
            validator: function (date) {
                return date >= new Date()
            }
        }
    },

    title: {
        type: "string",
        required: [true, "Title is required."],
    },

    status: {
        type: String,
        required: [true, "Invalid request."],
        enum: {
            values: ["draft", "live"],
            message: "Invalid request.",
        }
    },

    _isPartial: {
        type: Boolean,
        required: [true, "Invalid request."],
    },

    _createdAt: {
        type: Date,
        required: true,
        default: new Date()
    }
})

eventSchema.pre("save", function () {
    console.log("THIS-----", this)

    this.address.postcode = formatPostcode(this.address.postcode)
})

const Event = mongoose.model("Event", eventSchema, "Events");

const EventProjection = {_id: 0, address: {_id: 0}}
const EventHostUserProjection = {_id: 0, id: 1, username: 1, name: 1, pictureUrl: 1}