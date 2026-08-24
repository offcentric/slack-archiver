import fetch from 'node-fetch';

import * as dotenv from 'dotenv';
dotenv.config()

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function api(endpoint: string, payload?: any) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    return await res.json();
}