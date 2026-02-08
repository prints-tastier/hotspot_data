import mongoose from 'mongoose'
import {validateEmail, validateName, validatePassword, validateUsername} from "../validation.js";

export {
    User, UserPublic, UserPrivate
}

const userSchema = mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
    },

    username: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: validateUsername,
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: validateEmail,
        }
    },
    name: {
        type: String,
        required: false,
        validate: {
            validator: validateName,
        }
    },
    dateJoined: {
        type: Date,
        required: false,
    },
    pictureUrl: {
        type: String,
        required: true,
        default: null,
    },
    password: {
        type: String,
        required: true,
        validate: {
            validator: validatePassword
        }
    }
})

const UserPrivate = {_id: 0, password: 0}
const UserPublic = {_id: 0, password: 0, email: 0}


const User = mongoose.model("User", userSchema, "Users");