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
        required: [true, "Username is required."],
        unique: true,
        validate: {
            validator: validateUsername,
            message: "Username must be over three characters long start with a letter or underscore (_), and  only contain letters, numbers and underscores."
        }
    },
    email: {
        type: String,
        required: [true, "Email is required."],
        unique: true,
        validate: {
            validator: validateEmail,
            message: "Please enter a valid email address."
        }
    },
    name: {
        type: String,
        required: [true, "Name is required."],
        validate: {
            validator: validateName,
            message: "Name must be 30 characters or less."
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