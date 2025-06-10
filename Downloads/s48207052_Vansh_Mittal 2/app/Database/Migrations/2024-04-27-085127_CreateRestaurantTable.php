<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateRestaurantTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'restaurant_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => TRUE,
                'auto_increment' => TRUE,
            ],
            'restaurant_name' => [
                'type' => 'VARCHAR',
                'constraint' => '255',
            ],
            'address' => [
                'type' => 'VARCHAR',
                'constraint' => '255',
            ],
            'city' => [
                'type' => 'VARCHAR',
                'constraint' => '100',
            ],
            'state' => [
                'type' => 'VARCHAR',
                'constraint' => '100',
            ],
            'zip' => [
                'type' => 'INT',
                'constraint' => 11,
            ],
            'phone_number' => [
                'type' => 'INT',
                'constraint' => 11,
            ],
        ]);
        $this->forge->addKey('restaurant_id', TRUE);
        $this->forge->createTable('Restaurant');
    }

    public function down()
    {
        $this->forge->dropTable('Restaurant');
    }
}