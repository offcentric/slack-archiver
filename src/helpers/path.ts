const isAdminPath = (req) => {
    return req.originalUrl.indexOf('/adm') === 3;
}

export {isAdminPath};