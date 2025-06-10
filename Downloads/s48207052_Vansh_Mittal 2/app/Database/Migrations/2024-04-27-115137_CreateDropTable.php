<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class OrderItemTable extends Migration
{
    public function up()
    {
        $this->forge->dropTable('OrderItem');
        

    }

    public function down()
    {
        // Not needed for dropping a table
    }
}
