<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generate QR Codes</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <style>
        body {
            background-color: #f8f9fa;
            font-family: Arial, sans-serif;
        }
        .navbar {
            margin-bottom: 20px;
            background-color: #343a40;
        }
        .navbar-brand, .nav-link {
            color: #fff !important;
        }
        .container {
            max-width: 800px;
            margin: auto;
            margin-top: 50px;
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
            color: #0056b3;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .btn-primary {
            width: 100%;
            background-color: #0056b3;
            border-color: #0056b3;
            transition: background-color 0.3s ease;
        }
        .btn-primary:hover {
            background-color: #004080;
            border-color: #004080;
        }
        .qr-code-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            margin-top: 30px;
        }
        .qr-code-item {
            margin: 10px;
            text-align: center;
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            padding: 20px;
        }
        .qr-code-item img {
            max-width: 200px;
            border-radius: 10px;
            box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
            transition: transform 0.3s ease;
        }
        .qr-code-item img:hover {
            transform: scale(1.05);
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
<div class="container mt-5">
    <h1>Generate QR Codes for Tables</h1>
    <div class="row">
        <div class="col-md-6 offset-md-3">
            <div class="form-group">
                <input type="text" id="table_number" class="form-control" placeholder="Enter Table Number" required>
                <div class="invalid-feedback">Please enter a valid table number.</div>
            </div>
            <button id="generate_qr" class="btn btn-primary">Generate QR Code</button>
        </div>
    </div>
    <div class="qr-code-container" id="qr_codes_container">
        <?php if (isset($existingQrCodes) && !empty($existingQrCodes)): ?>
            <?php foreach ($existingQrCodes as $qrCode): ?>
                <div class="qr-code-item">
                    <p>Table: <?= esc($qrCode['table_number']) ?></p>
                    <img src="<?= esc($qrCode['qr_code_url']) ?>" alt="QR Code">
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</div>
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script>
    $(document).ready(function() {
        // Generate QR code button click event
        $('#generate_qr').click(function() {
            var tableNumber = $('#table_number').val();

            // Client-side validation
            if (!tableNumber) {
                $('#table_number').addClass('is-invalid');
                return;
            } else {
                $('#table_number').removeClass('is-invalid');
            }

            $.ajax({
                url: '<?= site_url('qr-code/generate') ?>',
                method: 'POST',
                data: {table_number: tableNumber},
                success: function(response) {
                    var data = JSON.parse(response);
                    $('.qr-code-container').append('<div class="qr-code-item"><p>Table: ' + tableNumber + '</p><img src="' + data.qr_code_url + '" alt="QR Code"></div>');
                    // Provide feedback to the user
                    alert('QR Code generated successfully!');
                },
                error: function() {
                    // Handle errors
                    alert('Error generating QR Code. Please try again.');
                }
            });
        });
    });
</script>
</body>
</html>

