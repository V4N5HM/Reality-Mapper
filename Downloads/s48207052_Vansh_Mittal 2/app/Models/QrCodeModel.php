<?php

namespace App\Models;

use CodeIgniter\Model;

class QrCodeModel extends Model
{
    protected $table = 'qr_codes';
    protected $primaryKey = 'TableId'; // Assuming 'TableId' is the primary key
    protected $allowedFields = ['user_id', 'table_number', 'qr_code_url'];
}
