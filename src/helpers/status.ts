export const successMessage = { status: 'ok', success: true, error: false };
export const errorMessage = { status: 'error', success: false, error: true, message: null, detail:null,stack: {}};

export const status = {
    success: 200,
    redirect:302,
    error: 500,
    notfound: 404,
    bad: 400,
    unauthorized: 401,
    forbidden: 403,
    not_found: 404,
    conflict: 409,
    unprocessable:422,
    too_many_requests:429,
    created: 201,
    nocontent: 204
};

export const codes:any = Object.values(status);
