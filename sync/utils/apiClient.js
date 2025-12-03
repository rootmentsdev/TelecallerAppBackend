import axios from "axios";

export const fetchAPI = async (url, options = {}) => {
  try {
    const res = await axios.get(url, {
      headers: {
        ...options.headers,
      },
      timeout: options.timeout || 30000,
      ...options,
    });
    return res.data;
  } catch (err) {
    console.error("API Fetch Error:", err.message);
    if (err.response) {
      console.error("Response status:", err.response.status);
      console.error("Response data:", err.response.data);
    }
    return null;
  }
};

// POST request helper for API calls
export const postAPI = async (url, data, options = {}) => {
  try {
    const res = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      timeout: options.timeout || 30000,
    });
    return res.data;
  } catch (err) {
    // Log detailed error information
    if (err.response) {
      // API responded with error status
      console.error("API POST Error - Response:", {
        status: err.response.status,
        statusText: err.response.statusText,
        data: err.response.data,
        url: url
      });
      
      // For authentication errors (401/403), return structured response indicating failure
      if (err.response.status === 401 || err.response.status === 403) {
        return {
          status: "error",
          message: "Authentication failed",
          data: null
        };
      }
      
      // For other HTTP errors, return null to indicate failure
      return null;
    } else if (err.request) {
      // Request was made but no response received (network error, timeout, etc.)
      console.error("API POST Error - No Response:", {
        message: err.message,
        url: url,
        timeout: options.timeout || 30000
      });
      return null;
    } else {
      // Error setting up request
      console.error("API POST Error - Setup:", err.message);
      return null;
    }
  }
};

