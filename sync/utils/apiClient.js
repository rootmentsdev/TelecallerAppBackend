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
    console.error("API POST Error:", err.message);
    if (err.response) {
      console.error("Response status:", err.response.status);
      console.error("Response data:", err.response.data);
    }
    return null;
  }
};

