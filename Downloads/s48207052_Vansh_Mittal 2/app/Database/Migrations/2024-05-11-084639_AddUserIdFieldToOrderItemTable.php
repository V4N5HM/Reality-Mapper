<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddStatusFieldToUserTable extends Migration
{
    public function up()
    {
        $fields = [
            'user_id' => [
                'type' => 'INT',
                'constraint' => 255,
                'unsigned' => TRUE,
            ]
        ];
        $this->forge->addColumn('OrderItem', $fields);
        $this->forge->addForeignKey('user_id', 'User', 'user_id', 'CASCADE', 'CASCADE');
    }

    public function down()
    {
        // Removing the 'status' field from the 'User' table
        $this->forge->dropColumn('User', 'status');
    }
}