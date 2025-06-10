<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateQrCodesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'TableId' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'user_id' => [
                'type' => 'INT',
                'constraint' => 255,
                'unsigned' => TRUE,
            ],
            'table_number' => [
                'type' => 'INT',
                'constraint' => 11,
            ],
            'qr_code_url' => [
                'type' => 'TEXT',
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);
        $this->forge->addPrimaryKey('TableId');
        $this->forge->addForeignKey('user_id', 'User', 'user_id', 'CASCADE', 'CASCADE'); // Assuming 'users' is your users table
        $this->forge->createTable('qr_codes');
    }

    public function down()
    {
        $this->forge->dropTable('qr_codes');
    }
}
