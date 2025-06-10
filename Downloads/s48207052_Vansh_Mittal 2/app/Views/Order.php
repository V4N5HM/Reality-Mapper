<!DOCTYPE html>
<html>
<head>
    <title>Order Management</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
    <style>
        body {
            background-color: #e9ecef;
            font-family: 'Arial', sans-serif;
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
        .nav-link {
            margin: 0 10px;
        }
        .menu-item {
            border-bottom: 1px solid #ddd;
            padding: 15px 0;
            display: flex;
            align-items: center;
            background-color: #f8f9fa;
            border-radius: 5px;
            margin-bottom: 10px;
        }
        .menu-item:last-child {
            border-bottom: none;
        }
        .menu-item:hover {
            background-color: #f1f1f1;
        }
        .menu-item img {
            width: 100px;
            height: 100px;
            object-fit: cover;
            margin-right: 15px;
            border-radius: 10px;
        }
        .order-summary {
            border-top: 1px solid #ddd;
            padding: 10px;
            font-weight: bold;
        }
        .order-summary p {
            margin: 5px 0;
        }
        .total {
            font-size: 1.5em;
            font-weight: bold;
        }
        .btn-primary {
            background-color: #0056b3;
            border-color: #0056b3;
            margin-top: 10px;
        }
        .btn-primary:hover {
            background-color: #0056b3;
            border-color: #0056b3;
        }
        .menu-category {
            margin-top: 20px;
            border-bottom: 2px solid #0056b3;
            padding-bottom: 5px;
            font-weight: bold;
            font-size: 1.5em;
            color: #0056b3;
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
<div class="container mt-4">
    <div class="row">
        <div class="col-md-8">
            <table class="order-table table">
                <thead>
                    <tr>
                        <th>Table Number</th>
                        <th>Item Name</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (!empty($groupedOrders)) : ?>
                        <?php foreach ($groupedOrders as $tableNumber => $items) : ?>
                            <tr id="table-row-<?= $tableNumber ?>">
                                <td><?= $tableNumber ?></td>
                                <td>
                                    <?php foreach ($items as $itemName => $item) : ?>
                                        <?= $itemName ?> <br>
                                    <?php endforeach; ?>
                                </td>
                                <td>
                                    <?php foreach ($items as $itemName => $item) : ?>
                                        <?= $item['quantity'] ?> <br>
                                    <?php endforeach; ?>
                                </td>
                                <td>
                                    <?php foreach ($items as $itemName => $item) : ?>
                                        <?= $item['price'] ?> <br>
                                    <?php endforeach; ?>
                                </td>
                                <td>
                                    <div class="form-check">
                                        <input class="form-check-input order-status-radio" type="radio" name="order<?= $tableNumber ?>" id="order<?= $tableNumber ?>-pending" value="pending" <?= $item['status'] == 'pending' ? 'checked' : '' ?>>
                                        <label class="form-check-label" for="order<?= $tableNumber ?>-pending">
                                            Pending
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input order-status-radio" type="radio" name="order<?= $tableNumber ?>" id="order<?= $tableNumber ?>-in-progress" value="in-progress" <?= $item['status'] == 'in-progress' ? 'checked' : '' ?>>
                                        <label class="form-check-label" for="order<?= $tableNumber ?>-in-progress">
                                            In Progress
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input order-status-radio" type="radio" name="order<?= $tableNumber ?>" id="order<?= $tableNumber ?>-completed" value="completed" <?= $item['status'] == 'completed' ? 'checked' : '' ?>>
                                        <label class="form-check-label" for="order<?= $tableNumber ?>-completed">
                                            Completed
                                        </label>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else : ?>
                        <tr>
                            <td colspan="5">No orders found.</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="5">Total Orders: <?= count(array_keys($groupedOrders)) ?></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div class="col-md-4">
            <div class="order-status">
                <h4 style="color: #0056b3;">Order Status</h4>
                <form id="status-form" action="<?= site_url('Order/updateStatus') ?>" method="post">
                    <div class="form-group">
                        <select class="form-control" name="table_number">
                            <?php if (!empty($groupedOrders)) : ?>
                                <?php foreach (array_keys($groupedOrders) as $tableNumber) : ?>
                                    <option><?= $tableNumber ?></option>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </select>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="status" id="order-status-pending" value="pending" checked>
                        <label class="form-check-label" for="order-status-pending">
                            Pending
                        </label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="status" id="order-status-in-progress" value="in-progress">
                        <label class="form-check-label" for="order-status-in-progress">
                            In Progress
                        </label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="status" id="order-status-completed" value="completed">
                        <label class="form-check-label" for="order-status-completed">
                            Completed
                        </label>
                    </div>
                    <button type="submit" class="btn btn-primary">Update Status</button>
                </form>
            </div>
        </div>
    </div>
</div>

<script>
    $(document).ready(function() {
        $('#status-form').submit(function(e) {
            e.preventDefault();
            var formData = $(this).serialize();
            $.post($(this).attr('action'), formData, function(response) {
                alert('Order status updated successfully.');
                location.reload();
            }).fail(function() {
                alert('Failed to update order status.');
            });
        });
    });
</script>

</body>
</html>
