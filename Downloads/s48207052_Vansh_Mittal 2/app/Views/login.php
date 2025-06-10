<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MenuScanOrder - Login</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <style>
        body {
            background-color: #f8f9fa;
            font-family: Arial, sans-serif;
        }
        .title {
            text-align: center;
            margin-bottom: 20px;
        }
        .title h1 {
            font-size: 48px;
            font-weight: bold;
            color: #0056b3;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
            margin-top: 50px;
        }
        .container {
            max-width: 400px;
            margin: auto;
            background-color: #fff;
            border-radius: 20px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
            padding: 40px;
        }
        h2 {
            text-align: center;
            margin-bottom: 30px;
            color: #0056b3;
        }
        .alert {
            margin-bottom: 20px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .btn-primary {
            width: 100%;
            background-color: #0056b3;
            border-color: #0056b3;
            border-radius: 30px;
            padding: 12px;
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .btn-primary:hover {
            background-color: #004080;
            border-color: #004080;
        }
        .signup-link {
            text-align: center;
            margin-top: 20px;
        }
        .signup-link a {
            color: #0056b3;
            text-decoration: none;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="title">
        <h1>MenuScanOrder</h1>
    </div>
    <div class="container">
        <h2>Login</h2>
        <?php if(session()->has('error')): ?>
            <div class="alert alert-danger"><?= session('error') ?></div>
        <?php endif; ?>
        <form action="<?= base_url('login') ?>" method="post">
            <div class="form-group">
                <input type="email" name="email" id="email" class="form-control" placeholder="Enter Your Email" value="<?= old('email') ?>" required>
            </div>
            <div class="form-group">
                <input type="password" name="password" id="password" class="form-control" placeholder="Enter Your Password" required>
            </div>
            <button type="submit" class="btn btn-primary">Login</button>
        </form>
        <div class="signup-link">
            <p>Don't have an account? <a href="<?= base_url('signup') ?>">Signup</a></p>
        </div>
    </div>
</body>
</html>
