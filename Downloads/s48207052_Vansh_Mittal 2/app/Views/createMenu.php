<!DOCTYPE html>
<html>
<head>
    <title>Easy Menu Management - MenuScanOrder</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <style>
        body {
            background-color: #e9ecef;
            font-family: 'Arial', sans-serif;
        }
        .header {
            background-color: #0056b3;
            padding: 20px;
            text-align: center;
            border-radius: 15px 15px 0 0;
        }
        .header h1 {
            color: #fff;
            font-size: 32px;
            margin: 0;
        }
        .navbar {
            margin-bottom: 20px;
            background-color: #343a40;
        }
        .navbar-brand, .nav-link {
            color: #fff !important;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
        }
        .table thead th {
            background-color: #0056b3;
            color: #ffffff;
            font-weight: bold;
        }
        .btn-primary {
            background-color: #0056b3;
            border-color: #0056b3;
        }
        .btn-primary:hover {
            background-color: #0056b3;
            border-color: #0056b3;
        }
        .form-group label {
            font-weight: bold;
            font-size: 1.1em;
        }
        .form-control {
            border-radius: 5px;
        }
        h2 {
            font-weight: bold;
            color: #0056b3;
        }
        .btn-danger {
            background-color: #dc3545;
            border-color: #dc3545;
        }
        .btn-danger:hover {
            background-color: #c82333;
            border-color: #bd2130;
        }
    </style>
</head>
<body>
<nav class="navbar navbar-expand-lg">
    <div class="container-fluid">
        <a class="navbar-brand" href="#">MenuScanOrder</a>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav mr-auto">
                <li class="nav-item">
                    <a class="nav-link" href="<?= site_url('menu') ?>">Create Menu</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="<?= site_url('Order') ?>">Table Management</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="<?= site_url('customer_menu') ?>">Menu</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="<?= site_url('qr-code') ?>">QR Code</a>
                </li>
            </ul>
            <ul class="navbar-nav">
                <li class="nav-item">
                    <a class="nav-link" href="<?= site_url('logout') ?>">Logout</a>
                </li>
            </ul>
        </div>
    </div>
</nav>
<div class="container">
    <h2 class="my-4 text-center">Easy Menu Management</h2>
    <form action="<?= site_url('menu/add') ?>" method="post">
        <div class="form-group">
            <label for="category">Category:</label>
            <input type="text" class="form-control" id="category" name="category" required>
        </div>
        <div class="form-group">
            <label for="item">Item:</label>
            <input type="text" class="form-control" id="item" name="item" required>
        </div>
        <div class="form-group">
            <label for="price">Price:</label>
            <input type="number" class="form-control" id="price" name="price" step="0.01" required>
        </div>
        <button type="submit" class="btn btn-primary">Add Item</button>
    </form>
    <h2 class="my-4 text-center">Current Menu</h2>
    <table class="table table-hover">
        <thead>
            <tr>
                <th>Category</th>
                <th>Item</th>
                <th>Price</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($menuItems as $menuItem): ?>
            <tr>
                <td><?= $menuItem['item_description'] ?></td>
                <td><?= $menuItem['item_name'] ?></td>
                <td>$<?= $menuItem['price'] ?></td>
                <td>
                    <a href="<?= site_url('menu/delete/'.$menuItem['menu_item_id']) ?>" class="btn btn-danger btn-sm">Delete</a>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.16.0/umd/popper.min.js"></script>
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
</body>
</html>
