<?php

namespace App\Models;

use CodeIgniter\Model;

class OrderItemModel extends Model
{
    protected $table = 'OrderItem';
    protected $primaryKey = 'order_item_id';
    protected $allowedFields = ['TableNumber', 'menu_item_id', 'ItemName', 'quantity', 'price', 'user_id', 'status'];

    // You may add other configurations or methods as needed...
}
