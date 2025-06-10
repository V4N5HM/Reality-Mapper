<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateTabNumTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'TableId' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => TRUE,
                'auto_increment' => TRUE,
            ],
            'TableNumber' => [
                'type' => 'INT',
                'constraint' => 11,
            ],
        ]);
        $this->forge->addKey('TableId', TRUE);
        $this->forge->createTable('TabNum');
    }

    public function down()
    {
        $this->forge->dropTable('TabNum');
    }
}