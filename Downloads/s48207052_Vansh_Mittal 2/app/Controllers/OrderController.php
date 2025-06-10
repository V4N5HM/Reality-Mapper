<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use App\Models\OrderItemModel;

class OrderController extends Controller
{
    // Display orders grouped by table number
    public function index()
    {
        // Retrieve user ID of the logged-in user
        $userId = session()->get('user')['id'];

        // Fetch order items from the database for the logged-in user
        $orderItemModel = new OrderItemModel();
        $orderItems = $orderItemModel->where('user_id', $userId)->findAll();

        // Group order items by table number and item name
        $groupedOrders = [];
        foreach ($orderItems as $orderItem) {
            $tableNumber = $orderItem['TableNumber'];
            $itemName = $orderItem['ItemName'];
            $quantity = $orderItem['quantity'];
            $price = $orderItem['price'];
            $status = $orderItem['status'] ?? 'pending'; // Default to 'pending' if status is not set

            if (!isset($groupedOrders[$tableNumber][$itemName])) {
                $groupedOrders[$tableNumber][$itemName] = [
                    'quantity' => $quantity,
                    'price' => $price,
                    'status' => $status
                ];
            } else {
                $groupedOrders[$tableNumber][$itemName]['quantity'] += $quantity;
                $groupedOrders[$tableNumber][$itemName]['price'] += $price;
            }
        }

        // Pass the grouped orders to the view
        return view('Order', ['groupedOrders' => $groupedOrders]);
    }

    // Update order status
    public function updateStatus()
    {
        // Retrieve table number and status from the request
        $tableNumber = $this->request->getPost('table_number');
        $status = $this->request->getPost('status');

        // Check if table number and status are provided
        if (!isset($tableNumber) || !isset($status)) {
            return redirect()->to(site_url('Order'))->with('error', 'Invalid request.');
        }

        // Sanitize table number and status
        $tableNumber = filter_var($tableNumber, FILTER_SANITIZE_NUMBER_INT);
        $status = filter_var($status, FILTER_SANITIZE_STRING);

        // Create an instance of the OrderItemModel
        $orderItemModel = new OrderItemModel();

        try {
            // Update order status based on the provided status
            if ($status === 'completed') {
                $orderItemModel->where('TableNumber', $tableNumber)->delete();
            } else {
                $orderItemModel->where('TableNumber', $tableNumber)
                               ->set('status', $status)
                               ->update();
            }

            // Return JSON response indicating success
            return $this->response->setJSON(['success' => true, 'status' => $status, 'table_number' => $tableNumber]);
        } catch (\Exception $e) {
            // Return JSON response indicating failure
            return $this->response->setJSON(['success' => false, 'error' => 'Failed to update order status.']);
        }
    }
}
