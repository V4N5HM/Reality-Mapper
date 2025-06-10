<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use App\Models\MenuItemModel;
use App\Models\OrderItemModel;

class MenuController extends Controller
{
    public function addItem()
    {
        // Load necessary helpers and libraries
        helper(['form']);

        // Retrieve form data
        $category = $this->request->getPost('category');
        $item = $this->request->getPost('item');
        $price = $this->request->getPost('price');

        // Retrieve user ID of the logged-in user
        $userId = session()->get('user')['id']; // Access 'user_id' key

        // Create an instance of the MenuItemModel
        $menuItemModel = new MenuItemModel();

        // Insert data into the database using the model
        $data = [
            'item_name' => $item,
            'item_description' => $category,
            'price' => $price,
            'user_id' => $userId // Assign the user ID as a foreign key
        ];
        $menuItemModel->insert($data);

        // Redirect to the page where you display the menu
        return redirect()->to(site_url('menu'));
    }

    public function showMenu()
{
    // Retrieve user ID of the logged-in user
    $userId = session()->get('user')['id']; // Access 'id' key

    // Fetch menu items from the database for the logged-in user
    $menuItemModel = new MenuItemModel();
    $data['menuItems'] = $menuItemModel->where('user_id', $userId)->findAll();

    // Load the view to display the menu
    return view('createMenu', $data);
}

    public function delete($id)
    {
        // Create an instance of the MenuItemModel
        $menuItemModel = new MenuItemModel();

        // Check if the menu item exists
        $menuItem = $menuItemModel->find($id);

        if ($menuItem) {
            // Delete the menu item from the database
            $menuItemModel->delete($id);

            // Redirect back to the menu page with success message
            return redirect()->to(site_url('menu'))->with('success', 'Menu item deleted successfully.');
        } else {
            // If menu item doesn't exist, redirect back with error message
            return redirect()->to(site_url('menu'))->with('error', 'Menu item not found.');
        }
    }

    public function customerMenu()
    {
        // Retrieve user ID and table number from the request if not logged in
        $userId = $this->request->getGet('user_id') ?? session()->get('user')['id'];
        $tableNumber = $this->request->getGet('table_number');

        // Fetch menu items from the database for the user
        $menuItemModel = new MenuItemModel();
        $menuItems = $menuItemModel->where('user_id', $userId)->findAll();

        // Group menu items by category
        $groupedMenuItems = [];
        foreach ($menuItems as $item) {
            $category = $item['item_description'];
            if (!isset($groupedMenuItems[$category])) {
                $groupedMenuItems[$category] = [];
            }
            $groupedMenuItems[$category][] = $item;
        }

        // Pass the grouped menu items and table number to the view
        $data['groupedMenuItems'] = $groupedMenuItems;
        $data['tableNumber'] = $tableNumber;
        $data['userId'] = $userId;

        // Load the customer menu view
        return view('customer_menu', $data);
    }

public function showMenuView()
{
    $groupedMenuItems = [];
    if (!empty($menuItems)) {
        // Group menu items by category
        foreach ($menuItems as $item) {
            // Check if the item description is a valid string
            if (is_string($item['item_description'])) {
                // Use item description as the category name
                $category = $item['item_description'];
                // Initialize the category array if not already present
                if (!isset($groupedMenuItems[$category])) {
                    $groupedMenuItems[$category] = [];
                }
                // Add the item to the corresponding category
                $groupedMenuItems[$category][] = $item;
            }
        }
    }
    $data['groupedMenuItems'] = $groupedMenuItems;
    // Load the view to display the menu
    return view('menu_view', $data);
}

public function placeOrder()
{
    // Retrieve user ID of the logged-in user
    $userId = session()->get('user')['id']; // Access 'id' key

    // Retrieve the selected menu items and their quantities from the form
    $orderItemsJson = $this->request->getPost('order_items');
    $status = $this->request->getPost('status'); // Retrieve status from the form

    // Decode the JSON string into an array
    $orderItems = json_decode($orderItemsJson, true);

    // Check if $orderItems is null or empty
    if (!empty($orderItems)) {
        // Generate a random table number
        $tableNumber = mt_rand(1, 100); // Adjust the range as needed

        // Create an instance of the OrderItemModel
        $orderItemModel = new OrderItemModel();

        // Insert order items into the OrderItem table
        foreach ($orderItems as $item) {
            $orderItemData = [
                'TableNumber' => $tableNumber,
                'menu_item_id' => $item['itemId'],
                'ItemName' => $item['itemName'],
                'quantity' => $item['quantity'],
                'price' => $item['itemPrice'],
                'user_id' => $userId, // Include the logged-in user's ID
                'status' => $status // Include the status
            ];
            $orderItemModel->insert($orderItemData);
        }

        // Redirect back to the menu page with success message
        return redirect()->to(site_url('customer_menu'))->with('success', 'Order placed successfully.');
    } else {
        // Handle case where no order items are selected
        return redirect()->to(site_url('customer_menu'))->with('error', 'No items selected for order.');
    }
}


public function showPublicMenu($userId, $tableNumber)
{
    // Fetch menu items from the database for the specified user
    $menuItemModel = new MenuItemModel();
    $menuItems = $menuItemModel->where('user_id', $userId)->findAll();

    // Initialize an empty array to store grouped menu items
    $groupedMenuItems = [];

    if (!empty($menuItems)) {
        // Group menu items by category
        foreach ($menuItems as $item) {
            // Check if the item description is a valid string
            if (is_string($item['item_description'])) {
                // Use item description as the category name
                $category = $item['item_description'];
                // Initialize the category array if not already present
                if (!isset($groupedMenuItems[$category])) {
                    $groupedMenuItems[$category] = [];
                }
                // Add the item to the corresponding category
                $groupedMenuItems[$category][] = $item;
            }
        }
    }

    // Pass the grouped menu items and user ID to the view
    $data['groupedMenuItems'] = $groupedMenuItems;
    $data['tableNumber'] = $tableNumber;
    $data['userId'] = $userId; // Pass the user ID to the view

    // Load the view to display the menu
    return view('public_menu_view', $data);
}


public function placeOrderUnauthenticated()
    {
        // Retrieve user ID from the request
        $userId = $this->request->getPost('user_id');
        // Retrieve table number from the request
        $tableNumber = $this->request->getPost('table_number');

        // Retrieve the selected menu items and their quantities from the form
        $orderItemsJson = $this->request->getPost('order_items');
        
        // Decode the JSON string into an array
        $orderItems = json_decode($orderItemsJson, true);

        if (!empty($orderItems)) {
            // Create an instance of the OrderItemModel
            $orderItemModel = new OrderItemModel();

            // Insert order items into the OrderItem table
            foreach ($orderItems as $item) {
                $orderItemData = [
                    'TableNumber' => $tableNumber,
                    'menu_item_id' => $item['itemId'],
                    'ItemName' => $item['itemName'],
                    'quantity' => $item['quantity'],
                    'price' => $item['itemPrice'],
                    'status' => 'pending', // Default status
                    'user_id' => $userId // Use user ID passed from the form
                ];
                $orderItemModel->insert($orderItemData);
            }
            

            // Redirect back to the same page with success message
            return redirect()->to(site_url('public_menu_view'))->with('success', 'Order placed successfully.');
        } else {
            // Redirect back to the same page with an error message
            return redirect()->to(site_url('public_menu_view'))->with('error', 'No items selected for order.');
        }
    }

}