<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateOrderItemTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'order_item_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => TRUE,
                'auto_increment' => TRUE,
            ],
            'TableNumber' => [
                'type' => 'INT',
                'constraint' => 40,
            ],
            'menu_item_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => TRUE,
            ],
            'ItemName' => [
                'type' => 'VARCHAR',
                'constraint' => 255,
            ],
            'quantity' => [
                'type' => 'INT',
                'constraint' => 11,
            ],
            'price' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
            ],
        ]);
        $this->forge->addKey('order_item_id', TRUE);
        $this->forge->addForeignKey('menu_item_id', 'MenuItem', 'menu_item_id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('OrderItem');
    }

    public function down()
    {
        $this->forge->dropTable('OrderItem');
    }
}