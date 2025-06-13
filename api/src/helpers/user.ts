import Exception from '../models/exception';
import {createHash, randomBytes} from 'crypto';
import {getEnvConfig} from "helpers/config";

export const getHashFromText = (plaintext:string, salt = 'M4rc0p4nT4n1!') =>{
    const extraSeed = '!r1dey0urown4dventur3!';
    if(!salt || salt == '' || salt.length < 10)
        throw new Exception('salt_missing');
    return createHash('sha1').update(plaintext + salt + extraSeed).digest('hex');
}

export const generateToken = (strong = false) =>{
    if(strong){
        return randomBytes(16).toString('base64');
    }
    return Array.from(Array(getEnvConfig('USER_LOGIN_TOKEN_LENGTH', 6)), () => Math.floor(Math.random() * 36).toString(36)).join('').toUpperCase();
}

export const UserRoles = {
    ROLE_ADMIN: 100,
    ROLE_SUPERUSER: 10,
    ROLE_USER: 1
}