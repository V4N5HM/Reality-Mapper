<?php

namespace App\Models;

use CodeIgniter\Model;

class MenuItemModel extends Model
{
    protected $table = 'MenuItem'; // Name of the database table
    protected $primaryKey = 'menu_item_id'; // Primary key of the table
    protected $allowedFields = ['item_name', 'item_description', 'price', 'user_id']; // Fields that can be mass-assigned
}
