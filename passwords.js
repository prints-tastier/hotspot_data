import argon2 from "argon2"

export {
    hash_password, verify_password
}

async function hash_password(password) {
    const hash = await argon2.hash(password)

    return hash
}

async function verify_password(hash, password) {
    const is_match = await argon2.verify(hash, password)

    return is_match
}