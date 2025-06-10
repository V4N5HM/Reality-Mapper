<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use App\Models\UserModel;

class AuthController extends Controller
{
    protected $userModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
    }

    public function login()
    {
        return view('login');
    }

    public function signup()
    {
        return view('signup');
    }

    public function authenticate()
    {
        $email = $this->request->getPost('email');
        $password = $this->request->getPost('password');

        // Fetch user data including the 'id' from the database
        $user = $this->userModel->where('email', $email)->first();

        if ($user && password_verify($password, $user['password'])) {
            // Authentication successful, set user session and redirect to main page
            session()->set('user', [
                'id' => $user['user_id'], // Use 'user_id' as the key
                'name' => $user['name'],
                'email' => $user['email']
            ]);
            return redirect()->to('menu');
        } else {
            // Authentication failed, redirect back to login with error message
            return redirect()->back()->with('error', 'Invalid email or password');
        }
    }
    

    public function register()
    {
        $data = [
            'name' => $this->request->getPost('name'),
            'email' => $this->request->getPost('email'),
            'password' => password_hash($this->request->getPost('password'), PASSWORD_DEFAULT),
        ];

        $this->userModel->insert($data);

        // Registration successful, redirect to login page
        return redirect()->to('login')->with('success', 'Registration successful. Please login.');
    }

    public function logout()
    {
        // Destroy user session
        session()->destroy();

        // Redirect to login page
        return redirect()->to(site_url('login'))->with('success', 'Logged out successfully.');
    }
}
