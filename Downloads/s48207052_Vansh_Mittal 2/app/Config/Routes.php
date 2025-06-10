<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

// Default route to the homepage
$routes->get('/', 'HomeController::index');

// Routes for user authentication
$routes->get('login', 'AuthController::login'); // Display login form
$routes->post('login', 'AuthController::authenticate'); // Process login
$routes->get('signup', 'AuthController::signup'); // Display signup form
$routes->post('signup', 'AuthController::register'); // Process signup
$routes->get('logout', 'AuthController::logout'); // Logout

// Routes for managing menu items
$routes->get('menu', 'MenuController::showMenu'); // Display menu
$routes->post('menu/add', 'MenuController::addItem'); // Add menu item
$routes->get('menu/delete/(:num)', 'MenuController::delete/$1'); // Delete menu item

// Route to display customer menu
$routes->get('customer_menu', 'MenuController::customerMenu'); // Display customer menu
$routes->get('menu_view', 'MenuController::customerMenu'); // Alias for displaying customer menu

// Route to place an order
$routes->post('menu/placeOrder', 'MenuController::placeOrder'); // Place an order

// Routes for managing orders
$routes->get('Order', 'OrderController::index'); // Display orders
$routes->post('Order/updateStatus', 'OrderController::updateStatus'); // Update order status

// Routes for generating QR codes
$routes->get('qr-code', 'QrCodeController::index'); // Display QR code generation form
$routes->post('qr-code/generate', 'QrCodeController::generate'); // Generate QR code

// Routes for displaying public menu
$routes->get('menu_view/(:num)/(:any)', 'MenuController::showPublicMenu/$1/$2'); // Display public menu with pagination
$routes->get('public_menu_view/', 'MenuController::showPublicMenu/$1/$2'); // Alias for displaying public menu
$routes->post('menu/placeOrderUnauthenticated', 'MenuController::placeOrderUnauthenticated'); // Place an order without authentication
