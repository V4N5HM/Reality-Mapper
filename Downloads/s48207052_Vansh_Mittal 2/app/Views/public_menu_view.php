<!DOCTYPE html>
<html>
<head>
    <title>Restaurant Menu</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css">
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
<div class="container mt-4">
    <div class="row">
        <div class="col-md-8">
            <?php if (!empty($groupedMenuItems)): ?>
                <?php foreach ($groupedMenuItems as $category => $items): ?>
                    <h2 id="<?= strtolower(str_replace(' ', '-', $category)) ?>"><?= $category ?></h2>
                    <?php foreach ($items as $item): ?>
                        <div class="menu-item">
                            <img src="<?= base_url('images/' . $item['image_url']) ?>" alt="<?= $item['item_name'] ?>">
                            <div>
                                <h4><?= $item['item_name'] ?></h4>
                                <p><?= $item['item_description'] ?></p>
                                <p>Price: $<?= number_format($item['price'], 2) ?></p>
                                <button class="btn btn-primary add-to-order" data-item-id="<?= $item['menu_item_id'] ?>" data-item-name="<?= $item['item_name'] ?>" data-item-price="<?= $item['price'] ?>">Add to Order</button>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endforeach; ?>
            <?php else: ?>
                <p>No menu items available.</p>
            <?php endif; ?>
        </div>
        <div class="col-md-4">
            <form method="post" action="<?= site_url('menu/placeOrderUnauthenticated') ?>">
                <div class="order-summary">
                    <h4>Your Order</h4>
                    <div id="order-items">
                        <!-- Order items will be displayed here -->
                    </div>
                    <input type="hidden" name="order_items" id="order-items-field">
                    <input type="hidden" name="table_number" value="<?= $tableNumber ?>"> <!-- Include the table number -->
                    <input type="hidden" name="user_id" value="<?= $userId ?>"> <!-- Include the user ID -->
                    <p class="total">Total: $<span id="total-amount">0.00</span></p>
                    <button type="submit" class="btn btn-primary">Order now</button>
                </div>
            </form>
        </div>
    </div>
</div>
<script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
<script>
    $(document).ready(function(){
        var totalAmount = 0;

        // Add to Order button click event
        $('.add-to-order').click(function(){
            var itemId = $(this).data('item-id');
            var itemName = $(this).data('item-name');
            var itemPrice = parseFloat($(this).data('item-price'));

            // Append the item to the order summary
            var orderItemHtml = '<p>' + itemName + ' - $' + itemPrice.toFixed(2) + '</p>';
            $('#order-items').append(orderItemHtml);

            // Update total amount
            totalAmount += itemPrice;
            $('#total-amount').text(totalAmount.toFixed(2));

            // Prepare order item object
            var orderItem = {
                itemId: itemId,
                itemName: itemName,
                itemPrice: itemPrice,
                quantity: 1 // You can add quantity functionality if needed
            };

            // Get current order items from hidden input field
            var orderItems = $('#order-items-field').val();

            // Parse existing order items or initialize as empty array
            orderItems = orderItems ? JSON.parse(orderItems) : [];

            // Add the new order item
            orderItems.push(orderItem);

            // Update the hidden input field value with the updated order items
            $('#order-items-field').val(JSON.stringify(orderItems));
        });
    });
</script>
</body>
</html>
