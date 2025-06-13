// app/helpers/validation.js

/**
 * isValidEmail helper method
 * @param {string} email
 * @returns {Boolean} True or False
 */
export const isValidEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
};

export const isValidPassword = (pwd) => {
    // minimum 8 chars with 1 number and 1 special character
    const re = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&\-%+-_,:])[A-Za-z\d@$!%*#?&%+\-_,:]{8,}$/;
    return re.test(String(pwd));
}

export const isValidDatetime = (dt) => {
    return true; /** TODO */
}

export const isValidTimestamp = (ts) => {
    // allow unix timestamp in seconds up to milliseconds
    const re = /^[0-9]{10,13}$/;
    return re.test(String(ts));
}

export const isNumeric = (n) => {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * isEmpty helper method
 * @param {string, integer} input
 * @returns {Boolean} True or False
 */
export const isEmpty = (input) => {
    if(typeof input == 'boolean'){
        return false;
    }
    if (typeof input === 'undefined' || input === undefined || input === null || input === '') {
        return true;
    }
    if(typeof input === 'number'){
        return false;
    }
    if (input && typeof input === 'string' && input.replace(/\s/g, '').length) {
        return false;
    }
    if(typeof input === 'object' && !!input && Object.keys(input).length){
        return false;
    }
    return true;
};
