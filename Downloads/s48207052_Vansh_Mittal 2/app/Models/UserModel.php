<?php

namespace App\Models;

use CodeIgniter\Model;

class UserModel extends Model
{
    protected $table = 'User'; // Name of the database table
    protected $primaryKey = 'user_id'; // Primary key of the table
    protected $allowedFields = ['email', 'password', 'name', 'status']; // Fields that can be mass assigned
}

