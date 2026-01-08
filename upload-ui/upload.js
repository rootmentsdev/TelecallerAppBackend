// API Base URL
const API_BASE_URL = window.location.origin;

// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const uploadStatus = document.getElementById('uploadStatus');
const userInfo = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');

// Get token from localStorage (same key as login.js uses)
function getAuthToken() {
    return localStorage.getItem('token');
}

// Check authentication on page load
window.addEventListener('DOMContentLoaded', () => {
    const token = getAuthToken();
    
    if (!token) {
        // No token - redirect to login
        window.location.href = '/login';
        return;
    }
    
    // Token exists - show upload section
    // Optionally verify token by calling /api/auth/profile
    verifyTokenAndLoadUser();
});

// Verify token and load user info
async function verifyTokenAndLoadUser() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '/login';
        return;
    }

    try {
        // Verify token by calling profile endpoint
        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            // Token invalid - redirect to login
            localStorage.removeItem('token');
            window.location.href = '/login';
            return;
        }

        const user = await response.json();
        
        // Display user info
        if (user) {
            userInfo.innerHTML = `
                <strong>Logged in as:</strong> ${user.name || user.employeeId || 'User'}<br>
                <strong>Store:</strong> ${user.store || 'N/A'}<br>
                <strong>Role:</strong> ${user.role || 'N/A'}
            `;
        }
    } catch (error) {
        console.error('Error verifying token:', error);
        // On error, redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
    }
}

// Upload Form Handler
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const leadType = document.getElementById('leadType').value;
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];

    const authToken = getAuthToken();
    if (!authToken) {
        // No token - redirect to login
        window.location.href = '/login';
        return;
    }

    if (!leadType) {
        showStatus(uploadStatus, 'error', 'Please select a lead type');
        return;
    }

    if (!file) {
        showStatus(uploadStatus, 'error', 'Please select a CSV file');
        return;
    }

    // Validate file type (CSV or Excel)
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        showStatus(uploadStatus, 'error', 'Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
        return;
    }

    try {
        showStatus(uploadStatus, 'info', 'Uploading and processing CSV file...');
        const uploadBtn = document.getElementById('uploadBtn');
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        // Create FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('leadType', leadType);

        const response = await fetch(`${API_BASE_URL}/api/import/csv`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Upload failed');
        }

        if (data.success) {
            const summary = data.summary || {};
            const message = `
                <strong>Upload Successful!</strong><br>
                <div class="status-details">
                    File: ${data.fileName || 'N/A'}<br>
                    Total Rows: ${summary.totalRows || 0}<br>
                    Inserted: ${summary.insertedCount || 0}<br>
                    Updated: ${summary.updatedCount || 0}<br>
                    Skipped (duplicates): ${summary.skippedCount || 0}<br>
                    Errors: ${summary.errorsCount || 0}
                </div>
            `;
            showStatus(uploadStatus, 'success', message);
            
            // Show errors if any
            if (data.errors && data.errors.length > 0) {
                const errorMsg = data.errors.slice(0, 5).map(e => 
                    `Row ${e.row}: ${e.error}`
                ).join('<br>');
                if (data.errors.length > 5) {
                    showStatus(uploadStatus, 'info', 
                        uploadStatus.innerHTML + `<br><br><strong>First 5 errors:</strong><br>${errorMsg}<br>... and ${data.errors.length - 5} more`);
                } else {
                    showStatus(uploadStatus, 'info', 
                        uploadStatus.innerHTML + `<br><br><strong>Errors:</strong><br>${errorMsg}`);
                }
            }
            
            // Reset form
            uploadForm.reset();
        } else {
            throw new Error(data.message || 'Upload failed');
        }
    } catch (error) {
        let errorMessage = error.message;
        
        // Try to parse error response
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Authentication failed. Please login again.';
            localStorage.removeItem('token');
            window.location.href = '/login';
            return;
        }
        
        showStatus(uploadStatus, 'error', `Upload failed: ${errorMessage}`);
    } finally {
        const uploadBtn = document.getElementById('uploadBtn');
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload CSV';
    }
});

// Logout Handler
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
});

// Helper Functions

function showStatus(element, type, message) {
    element.className = 'status';
    if (type) {
        element.classList.add(type);
    }
    element.innerHTML = message;
    element.style.display = message ? 'block' : 'none';
}
