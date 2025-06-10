// application/Views/home.php

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MenuScanOrder - Home</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f8f9fa;
            color: #495057;
        }
        .container {
            max-width: 800px;
            margin: auto;
            padding: 50px 20px;
            text-align: center;
        }
        h1 {
            font-size: 48px;
            font-weight: bold;
            color: #0056b3;
            margin-bottom: 30px;
        }
        p {
            font-size: 18px;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .btn-primary {
            background-color: #0056b3;
            border-color: #0056b3;
            padding: 14px 40px;
            font-size: 20px;
            font-weight: bold;
            text-transform: uppercase;
            border-radius: 30px;
        }
        .btn-primary:hover {
            background-color: #004080;
            border-color: #004080;
        }
        .feature {
            margin-bottom: 50px;
        }
        .feature h2 {
            font-size: 36px;
            font-weight: bold;
            color: #0056b3;
            margin-bottom: 20px;
        }
        .feature p {
            font-size: 18px;
            line-height: 1.6;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to MenuScanOrder</h1>
        <p>Streamline your restaurant's ordering process with our innovative platform.</p>
        <a href="<?= base_url('signup') ?>" class="btn btn-primary">Get Started</a>
    </div>

    <div class="container feature">
        <h2>Key Features</h2>
        <div class="row">
            <div class="col-md-4">
                <h3>Digital Menu Creation</h3>
                <p>Create and manage digital menus with ease, including categories, items, and pricing.</p>
            </div>
            <div class="col-md-4">
                <h3>QR Code Generation</h3>
                <p>Automatically generate unique QR codes for each table to facilitate easy menu access.</p>
            </div>
            <div class="col-md-4">
                <h3>Seamless Ordering</h3>
                <p>Guests can scan QR codes at their tables to view menus and place orders directly from their smartphones.</p>
            </div>
        </div>
    </div>
</body>
</html>
