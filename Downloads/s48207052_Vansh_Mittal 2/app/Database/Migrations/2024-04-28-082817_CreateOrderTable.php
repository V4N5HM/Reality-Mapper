<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateOrderTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'order_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => TRUE,
                'auto_increment' => TRUE,
            ],
            'table_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => TRUE,
            ],
            'order_date' => [
                'type' => 'DATE',
            ],
            'order_time' => [
                'type' => 'TIME',
            ],
        ]);
        $this->forge->addKey('order_id', TRUE);
        $this->forge->addForeignKey('table_id', 'Table', 'table_id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('Order');
    }

    public function down()
    {
        $this->forge->dropTable('Order');
    }
}