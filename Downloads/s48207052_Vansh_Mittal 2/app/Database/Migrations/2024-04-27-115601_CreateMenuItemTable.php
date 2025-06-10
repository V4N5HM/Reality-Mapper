<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateMenuItemTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'menu_item_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => TRUE,
                'auto_increment' => TRUE,
            ],
            'item_name' => [
                'type' => 'VARCHAR',
                'constraint' => '255',
            ],
            'item_description' => [
                'type' => 'TEXT',
            ],
            'price' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
            ],
            'image_url' => [
                'type' => 'VARCHAR',
                'constraint' => '255',
            ],
        ]);
        $this->forge->addKey('menu_item_id', TRUE);
        $this->forge->createTable('MenuItem');
    }

    public function down()
    {
        $this->forge->dropTable('MenuItem');
    }
}
