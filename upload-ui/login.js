// API Base URL
const API_BASE_URL = window.location.origin;

// Token key constant - unified across all files
const TOKEN_KEY = "token";

// DOM Elements
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');

// Login Form Handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const employeeId = document.getElementById('employeeId').value.trim();
    const password = document.getElementById('password').value;

    if (!employeeId || !password) {
        showError('Please enter both Employee ID and Password');
        return;
    }

    try {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        hideError();

        // Call existing /api/auth/login endpoint (same as mobile app)
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ employeeId, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        if (data.success && data.token) {
            // Store token in localStorage (same key as mobile app expects)
            localStorage.setItem(TOKEN_KEY, data.token);
            
            // Redirect to upload page
            window.location.href = '/upload';
        } else {
            throw new Error(data.message || 'Login failed');
        }
    } catch (error) {
        showError(error.message || 'Login failed. Please try again.');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
});

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

function hideError() {
    errorMessage.textContent = '';
    errorMessage.classList.remove('show');
}
