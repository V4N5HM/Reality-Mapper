<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use App\Models\QrCodeModel;

class QrCodeController extends Controller
{
    // Display QR code generation form
    public function index()
    {
        // Retrieve user ID of the logged-in user
        $userId = session()->get('user')['id'];

        // Fetch existing QR codes for the user from the database
        $qrCodeModel = new QrCodeModel();
        $existingQrCodes = $qrCodeModel->where('user_id', $userId)->findAll();

        // Pass existing QR codes to the view
        return view('qr_code_form', ['existingQrCodes' => $existingQrCodes]);
    }

    // Generate QR code
    public function generate()
    {
        // Retrieve user ID and table number from the request
        $userId = session()->get('user')['id'];
        $tableNumber = $this->request->getPost('table_number');

        // Define the URL to redirect to after scanning the QR code
        $redirectUrl = site_url('menu_view/' . $userId . '/' . urlencode($tableNumber));

        // Generate QR code URL using qrserver.com with the redirect URL
        $qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?data=' . urlencode($redirectUrl);

        // Insert data into the database
        try {
            $qrCodeModel = new QrCodeModel();
            $data = [
                'user_id' => $userId,
                'table_number' => $tableNumber,
                'qr_code_url' => $qrCodeUrl
            ];
            $qrCodeModel->insert($data);
        } catch (\Exception $e) {
            // Log error and return error message
            log_message('error', 'Error inserting QR code data into the database: ' . $e->getMessage());
            return json_encode(['error' => 'An error occurred while inserting data into the database.']);
        }

        // Return the QR code URL and redirect URL as JSON
        return json_encode(['qr_code_url' => $qrCodeUrl, 'redirect_url' => $redirectUrl]);
    }
}
