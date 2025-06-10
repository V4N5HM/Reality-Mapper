<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddStatusFieldToUserTable extends Migration
{
    public function up()
    {
        $fields = [
            'status' => [
                'type' => 'VARCHAR',
                'constraint' => '100',
            ]
        ];
        $this->forge->addColumn('OrderItem', $fields);
    }

    public function down()
    {
        // Removing the 'status' field from the 'User' table
        $this->forge->dropColumn('OrderItem', 'status');
    }
}