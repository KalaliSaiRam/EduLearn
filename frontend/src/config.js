// Central API configuration
// In development: defaults to localhost:5000
// In production: set VITE_API_BASE in your .env or hosting environment
const API_BASE = import.meta.env.VITE_API_URL;
export default API_BASE;
