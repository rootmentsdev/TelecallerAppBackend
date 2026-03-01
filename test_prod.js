import axios from 'axios';

async function test() {
    try {
        const loginRes = await axios.post('https://telecallerappbackend.onrender.com/admin/auth/login', {
            username: 'admin',
            password: 'admin123' // idk what the password is, wait. The prompt previously said "credentials admin and admin123"
        });
        console.log("Login Res:", loginRes.data);
    } catch (err) {
        console.error("Login Error:", err.message);
        if (err.response) {
            console.error(err.response.data);
        }
    }
}

test();
